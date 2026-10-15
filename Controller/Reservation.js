
import Reservation from "../Schema/Reservation.js";
import Table from "../Schema/Table.js";

export const createReservation = async (req, res) => {
    try {
        const { table, date, startTime, guests, specialRequests } = req.body;

        if (!table || !date || !startTime || !guests) {
            return res.status(400).json({
                success: false,
                message: "Please provide table, date, start time, and number of guests",
            });
        }

        const reservationDate = new Date(date);

        if (isNaN(reservationDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation date",
            });
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid start time. Use HH:mm format, e.g. 14:00",
            });
        }

        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + 60;

        if (endMinutes > 24 * 60) {
            return res.status(400).json({
                success: false,
                message: "Reservation must end before midnight",
            });
        }

        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

        if (!Number.isInteger(Number(guests)) || Number(guests) < 1) {
            return res.status(400).json({
                success: false,
                message: "Number of guests must be a positive whole number",
            });
        }

        const tableExists = await Table.findById(table);

        if (!tableExists) {
            return res.status(404).json({
                success: false,
                message: "Selected table not found",
            });
        }

        if (tableExists.isAvailable === false) {
            return res.status(400).json({
                success: false,
                message: "This table is currently unavailable",
            });
        }

        if (tableExists.seats && Number(guests) > tableExists.seats) {
            return res.status(400).json({
                success: false,
                message: "Number of guests exceeds the table capacity",
            });
        }

        const requestedStart = new Date(reservationDate);
        requestedStart.setHours(hours, minutes, 0, 0);

        if (requestedStart <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Reservation must be scheduled for a future time",
            });
        }

        const existingReservations = await Reservation.find({
            table,
            date: {
                $gte: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate()),
                $lt: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1),
            },
            status: { $in: ["Pending", "Confirmed"] },
        });

        const hasConflict = existingReservations.some((reservation) => {
            const existingStart = reservation.startTime.split(":").map(Number);
            const existingEnd = reservation.endTime.split(":").map(Number);

            const existingStartMinutes = existingStart[0] * 60 + existingStart[1];
            const existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];

            return startMinutes < existingEndMinutes && endMinutes > existingStartMinutes;
        });

        if (hasConflict) {
            return res.status(409).json({
                success: false,
                message: "This table is already reserved for the selected time. Please choose another time.",
            });
        }

        const reservation = await Reservation.create({
            user: req.user._id,
            table,
            date: reservationDate,
            startTime,
            endTime,
            guests: Number(guests),
            specialRequests,
        });

        return res.status(201).json({
            success: true,
            message: "Reservation created successfully",
            reservation,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating reservation",
        });
    }
};

export const getUserReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find({ user: req.user._id })
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching your reservations",
        });
    }
};

export const getAllReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find()
            .populate("user", "name email")
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching all reservations",
        });
    }
};

export const updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["Pending", "Confirmed", "Cancelled", "Completed"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing status value",
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        if (status === "Pending" || status === "Confirmed") {
            const existingReservations = await Reservation.find({
                _id: { $ne: reservation._id },
                table: reservation.table,
                date: {
                    $gte: new Date(reservation.date.getFullYear(), reservation.date.getMonth(), reservation.date.getDate()),
                    $lt: new Date(reservation.date.getFullYear(), reservation.date.getMonth(), reservation.date.getDate() + 1),
                },
                status: { $in: ["Pending", "Confirmed"] },
            });

            const [startHours, startMinutes] = reservation.startTime.split(":").map(Number);
            const [endHours, endMinutes] = reservation.endTime.split(":").map(Number);

            const start = startHours * 60 + startMinutes;
            const end = endHours * 60 + endMinutes;

            const hasConflict = existingReservations.some((item) => {
                const [itemStartHours, itemStartMinutes] = item.startTime.split(":").map(Number);
                const [itemEndHours, itemEndMinutes] = item.endTime.split(":").map(Number);

                const itemStart = itemStartHours * 60 + itemStartMinutes;
                const itemEnd = itemEndHours * 60 + itemEndMinutes;

                return start < itemEnd && end > itemStart;
            });

            if (hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: "This table has another active reservation during that time",
                });
            }
        }

        reservation.status = status;
        await reservation.save();

        return res.status(200).json({
            success: true,
            message: "Reservation status updated successfully",
            reservation,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating reservation",
        });
    }
};

export const deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        const isManager = req.user.role === "Manager";
        const isOwner = reservation.user.toString() === req.user._id.toString();

        if (!isManager && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this reservation",
            });
        }

        await reservation.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Reservation deleted successfully",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting reservation",
        });
    }
};
