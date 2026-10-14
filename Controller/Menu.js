import Menu from "../Schema/Menu.js";
import { cloudinaryUpload } from "../utils/Upload.js";

export const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, isAvailable } = req.body;
        if (!name || !description || !price || !category) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image"
            });
        }

        const uploadImage = await cloudinaryUpload(req.file.buffer);
        const menuItem = await Menu.create({
            ...req.body,
            image: {
                public_id: uploadImage.public_id,
                url: uploadImage.secure_url
            }
        });
        return res.status(201).json({
            success: true,
            message: "Menu item created successfully",
            menuItem
        });
    } catch (error) {
        console.log("Create menu item error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating the menu item"
        });
    }
};

export const getAllMenuItems = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const menuItems = await Menu.find(query);
        return res.status(200).json({
            success: true,
            count: menuItems.length,
            menuItems,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching menu items",
        });
    }
};

export const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await Menu.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }
        return res.status(200).json({
            success: true,
            menuItem,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

export const updateMenuItem = async (req, res) => {
    try {
        const menuItem = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            menuItem,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating menu item",
        });
    }
};

export const deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await Menu.findByIdAndDelete(req.params.id);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Menu item deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting menu item",
        });
    }
};