import Reservation from "../Schema/Reservation.js";
import Table from "../Schema/Table.js";

export const createReservation = async (req, res) => {
    try {
        const { table, date, guests, specialRequests } = req.body;

        if (!table || !date || !guests) {
            return res.status(400).json({
                success: false,
                message: "Please provide table, date, and number of guests",
            });
        }
        const tableExists = await Table.findById(table);
        if (!tableExists) {
            return res.status(404).json({
                success: false,
                message: "Selected table not found",
            });
        }
        const reservation = await Reservation.create({ user: req.user._id, table, date, guests, specialRequests });

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
        const reservations = await Reservation.find({ user: req.user._id }).populate("table").sort({ date: -1 });
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
        const reservations = await Reservation.find().populate("user", "name email").populate("table").sort({ date: -1 });
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
        const reservation = await Reservation.findByIdAndUpdate( req.params.id, { status }, { new: true, runValidators: true });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }
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
        if (req.user.role !== "Manager" && reservation.user.toString() !== req.user._id.toString()) {
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