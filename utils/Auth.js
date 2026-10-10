import jwt from "jsonwebtoken";
import User from "../Schema/User.js";

export const isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "User is not logged in"
            });
        }

        const decodedData = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decodedData.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (decodedData.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


export const isManager = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to access this resource"
            });
        }
        next();
    };
};