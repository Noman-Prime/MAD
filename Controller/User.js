import User from "../Schema/User.js"
import bcrypt from "bcryptjs"
import sendToken from "../utils/Token.js"
import cloudinary from "../utils/Cloudinary.js";

export const signUp = async (req, res) => {
    try {
        const { name, email, password, role } = req.body
        if (!name || !email || !password || !role) {
            return res.status(401).json({
                success: false,
                message: "plz fill the reuired form"
            })
        }
        const alreadyUser = await User.findOne({ email })
        if (alreadyUser) {
            return res.status(401).json({
                success: false,
                message: "User already exist. Plz login"
            })
        }
        const user = await User.create(req.body)
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User is not created"
            })
        }
        return sendToken(user, 201, res)
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Somethig went wrong"
        })
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Plz fill the reuired fields"
            })
        }
        const user = await User.findOne({ email }).select("+password")
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "This user dosen't exist! plz signup"
            })
        }
        const comparePassword = await bcrypt.compare(password, user.password)
        if (!comparePassword) {
            return res.status(401).json({
                success: false,
                message: "User name or password is wrong"
            })
        }
        return sendToken(user, 200, res)
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong."
        })
    }
}

export const logOut = async (req, res) => {
    try {
        return res.status(200).cookie("token", null, { expires: new Date(0), httpOnly: true }).json({
            success: true,
            message: "User is loged Out successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        })
    }
}

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide both old and new passwords",
            });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Your old password is incorrect",
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching users",
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found / updated",
            });
        }
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating",
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).cookie("token", null, { expires: new Date(0), httpOnly: true }).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting",
        });
    }
};

export const updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image.",
            });
        }

        if (!req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({
                success: false,
                message: "Upload a valid image.",
            });
        }

        // Continue with your existing Cloudinary upload and user save logic.
    } catch (error) {
        console.log("Profile image upload error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Profile image upload failed.",
        });
    }
};