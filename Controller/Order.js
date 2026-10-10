import Order from "../Schema/Order.js";
import Menu from "../Schema/Menu.js";

export const createOrder = async (req, res) => {
    try {
        const { orderItems, deliveryAddress, paymentMethod } = req.body;
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No order items provided",
            });
        }
        if (!deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: "Please provide a delivery address",
            });
        }
        let calculatedTotal = 0;
        const verifiedOrderItems = [];

        for (const item of orderItems) {
            const menuItem = await Menu.findById(item.menuItem);
            if (!menuItem) {
                return res.status(404).json({
                    success: false,
                    message: `Menu item not found: ${item.menuItem}`,
                });
            }
            if (!menuItem.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Item '${menuItem.name}' is currently unavailable`,
                });
            }
            const itemTotal = menuItem.price * item.quantity;
            calculatedTotal += itemTotal;
            verifiedOrderItems.push({
                menuItem: menuItem._id,
                quantity: item.quantity,
                price: menuItem.price
            });
        }
        const order = await Order.create({
            user: req.user._id,
            orderItems: verifiedOrderItems,
            totalAmount: calculatedTotal,
            deliveryAddress,
            paymentMethod: paymentMethod || "Cash On Delivery"
        });
        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating order",
        });
    }
};

export const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).populate("orderItems.menuItem") .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching your orders",
        });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate("user", "name email").populate("orderItems.menuItem").sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching all orders",
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const validStatuses = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
        if (!orderStatus || !validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing order status",
            });
        }
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { orderStatus },
            { new: true, runValidators: true }
        );
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating order status",
        });
    }
};