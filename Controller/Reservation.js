import Reservation from "../Schema/Reservation.js";
import Table from "../Schema/Table.js";
import User from "../Schema/User.js";

export const createReservation = async (req, res) => {
    try {
        const { table, date, startTime, guests, specialRequests } = req.body;

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        if (!table || !date || !startTime || guests === undefined) {
            return res.status(400).json({
                success: false,
                message: "Please provide table, date, start time, and number of guests"
            });
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid start time format. Use HH:mm"
            });
        }

        const reservationDate = new Date(date);

        if (Number.isNaN(reservationDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation date"
            });
        }

        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Guests must be a positive integer"
            });
        }

        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + 60;

        if (endMinutes > 24 * 60) {
            return res.status(400).json({
                success: false,
                message: "Reservations cannot extend beyond midnight"
            });
        }

        const endTime =
            `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:` +
            `${String(endMinutes % 60).padStart(2, "0")}`;

        const now = new Date();
        const reservationStart = new Date(reservationDate);
        reservationStart.setHours(hours, minutes, 0, 0);

        if (reservationStart <= now) {
            return res.status(400).json({
                success: false,
                message: "Reservation must be in the future"
            });
        }

        const selectedTable = await Table.findById(table);

        if (!selectedTable) {
            return res.status(404).json({
                success: false,
                message: "Table not found"
            });
        }

        if (selectedTable.isAvailable === false) {
            return res.status(400).json({
                success: false,
                message: "This table is not available"
            });
        }

        if (guestCount > selectedTable.seats) {
            return res.status(400).json({
                success: false,
                message: `This table can accommodate only ${selectedTable.seats} guests`
            });
        }

        const dayStart = new Date(reservationDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(reservationDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingReservations = await Reservation.find({
            table,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ["Pending", "Confirmed"] }
        });

        const hasConflict = existingReservations.some((reservation) => {
            return (
                startMinutes < reservation.endTime.split(":").map(Number)[0] * 60 +
                    Number(reservation.endTime.split(":")[1]) &&
                endMinutes > reservation.startTime.split(":").map(Number)[0] * 60 +
                    Number(reservation.startTime.split(":")[1])
            );
        });

        if (hasConflict) {
            return res.status(409).json({
                success: false,
                message: "This table is already reserved for that time"
            });
        }

        const reservation = await Reservation.create({
            user: req.user._id,
            table,
            date: reservationDate,
            startTime,
            endTime,
            guests: guestCount,
            specialRequests
        });

        const populatedReservation = await Reservation.findById(reservation._id)
            .populate({ path: "user", select: "name email", model: User })
            .populate("table");

        return res.status(201).json({
            success: true,
            message: "Reservation created successfully",
            reservation: populatedReservation
        });
    } catch (error) {
        console.error("Create reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create reservation"
        });
    }
};

export const getUserReservations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        const reservations = await Reservation.find({
            user: req.user._id
        })
            .populate({ path: "user", select: "name email", model: User })
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations
        });
    } catch (error) {
        console.error("Get user reservations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch your reservations"
        });
    }
};

export const getAllReservations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        if (req.user.role !== "Manager") {
            return res.status(403).json({
                success: false,
                message: "Only managers can view all reservations"
            });
        }

        const reservations = await Reservation.find()
            .populate({ path: "user", select: "name email", model: User })
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations
        });
    } catch (error) {
        console.error("Get all reservations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservations"
        });
    }
};

export const updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Cancelled",
            "Completed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation status"
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        if (status === "Pending" || status === "Confirmed") {
            const [hours, minutes] = reservation.startTime.split(":").map(Number);
            const startMinutes = hours * 60 + minutes;

            const [endHours, endMinutesPart] = reservation.endTime
                .split(":")
                .map(Number);
            const finishMinutes = endHours * 60 + endMinutesPart;

            const dayStart = new Date(reservation.date);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(reservation.date);
            dayEnd.setHours(23, 59, 59, 999);

            const otherReservations = await Reservation.find({
                _id: { $ne: reservation._id },
                table: reservation.table,
                date: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ["Pending", "Confirmed"] }
            });

            const hasConflict = otherReservations.some((other) => {
                const [otherStartHours, otherStartMinutes] =
                    other.startTime.split(":").map(Number);
                const otherStart =
                    otherStartHours * 60 + otherStartMinutes;

                const [otherEndHours, otherEndMinutes] =
                    other.endTime.split(":").map(Number);
                const otherEnd = otherEndHours * 60 + otherEndMinutes;

                return startMinutes < otherEnd && finishMinutes > otherStart;
            });

            if (hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: "This table already has a reservation at that time"
                });
            }
        }

        reservation.status = status;
        await reservation.save();

        const updatedReservation = await Reservation.findById(reservation._id)
            .populate({ path: "user", select: "name email", model: User })
            .populate("table");

        return res.status(200).json({
            success: true,
            message: "Reservation status updated successfully",
            reservation: updatedReservation
        });
    } catch (error) {
        console.error("Update reservation status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update reservation status"
        });
    }
};

export const deleteReservation = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        const isOwner =
            reservation.user.toString() === req.user._id.toString();
        const isManager = req.user.role === "Manager";

        if (!isOwner && !isManager) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this reservation"
            });
        }

        await Reservation.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Reservation deleted successfully"
        });
    } catch (error) {
        console.error("Delete reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete reservation"
        });
    }
};