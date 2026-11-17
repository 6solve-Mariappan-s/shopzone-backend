// import { Router } from "express";
// import axios from "axios";
// import jwt from "jsonwebtoken";
// import { z } from "zod";
// import { CheckoutSession } from "../models/CheckoutSession.js";
// import { sequelize } from "../db.js";
// import { config } from "../config.js";
// import { requireAuth } from "../middleware.js";

// export const router = Router();
// router.use(requireAuth);

// export const checkoutInputSchema = z.object({
//   shippingAddress: z.object({
//     recipient: z.string().min(2),
//     phone: z.string().min(8),
//     line1: z.string().min(3),
//     city: z.string().min(2),
//     state: z.string().min(2),
//     pinCode: z.string().regex(/^\d{6}$/)
//   }),
//   method: z.enum(["COD", "UPI", "CARD", "NET_BANKING"]),
//   couponCode: z.string().trim().max(40).optional()
// });

// router.get("/", async (req, res, next) => {
//   try {
//     const sessions = await CheckoutSession.findAll({
//       where: { userId: req.user.sub },
//       order: [["createdAt", "DESC"]],
//       limit: 50
//     });
//     res.json(sessions);
//   } catch (error) { next(error); }
// });

// router.post("/", async (req, res, next) => {
//   const input = checkoutInputSchema.safeParse(req.body);
//   if (!input.success) return res.status(400).json({ error: "Invalid checkout request", details: input.error.issues });

//   const token = jwt.sign({ sub: req.user.sub, role: req.user.role }, config.JWT_SECRET, { expiresIn: "2m" });
//   const headers = { Authorization: `Bearer ${token}` };
//   const serviceToken = jwt.sign({ sub: req.user.sub, role: "CHECKOUT" }, config.JWT_SECRET, { expiresIn: "2m" });
//   const checkoutHeaders = { Authorization: `Bearer ${serviceToken}` };
//   const session = await CheckoutSession.create({
//     userId: req.user.sub,
//     status: "STARTED",
//     context: { method: input.data.method }
//   });
//   const reservations = [];
//   let order;

//   try {
//     const cart = (await axios.get(`${config.CART_SERVICE_URL}/api/cart`, { headers, timeout: 5000 })).data;
//     if (!cart.items?.length) throw Object.assign(new Error("Cart is empty"), { status: 400 });

//     const lines = [];
//     for (const line of cart.items) {
//       const product = (await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products/${line.productId}`, { timeout: 5000 })).data;
//       if (!product.active) throw Object.assign(new Error("A cart product is no longer available"), { status: 409 });
//       await axios.post(`${config.INVENTORY_SERVICE_URL}/api/inventory/reserve`, {
//         productId: line.productId,
//         quantity: line.quantity
//       }, { headers: checkoutHeaders, timeout: 5000 });
//       reservations.push({ productId: line.productId, quantity: line.quantity });
//       lines.push({
//         productId: line.productId,
//         name: product.name,
//         quantity: line.quantity,
//         unitPricePaise: product.pricePaise
//       });
//     }

//     const totalPaise = lines.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
//     order = (await axios.post(`${config.ORDER_SERVICE_URL}/api/orders`, {
//       status: "PLACED",
//       items: lines,
//       totalPaise,
//       shippingAddress: input.data.shippingAddress
//     }, { headers: checkoutHeaders })).data;

//     let payment = null;
//     if (input.data.method !== "COD") {
//       payment = (await axios.post(`${config.PAYMENT_SERVICE_URL}/api/payments`, {
//         orderId: order.id,
//         amountPaise: totalPaise,
//         method: input.data.method,
//         status: "PENDING"
//       }, { headers: checkoutHeaders })).data;
//       await axios.post(`${config.SHIPPING_SERVICE_URL}/api/shipping`, {
//         orderId: order.id,
//         address: input.data.shippingAddress,
//         status: "LABEL_PENDING"
//       }, { headers: checkoutHeaders });
//     }

//     await axios.delete(`${config.CART_SERVICE_URL}/api/cart`, { headers, timeout: 5000 });
//     await session.update({
//       orderId: order.id,
//       status: "COMPLETED",
//       totalPaise,
//       context: { method: input.data.method, ...(payment ? { paymentId: payment.id } : {}) }
//     });
//     res.status(201).json({
//       session,
//       order,
//       payment,
//       paymentNotice: input.data.method === "COD"
//         ? "Cash on Delivery selected."
//         : "Payment intent is pending a configured payment provider; no card details were collected."
//     });
//   } catch (error) {
//     for (const reservation of reservations) {
//       await axios.post(`${config.INVENTORY_SERVICE_URL}/api/inventory/release`, reservation, {
//         headers: checkoutHeaders,
//         timeout: 3000
//       }).catch((compensationError) => {
//         console.error("Checkout compensation failed:", compensationError);
//       });
//     }
//     if (order) {
//       await axios.patch(`${config.ORDER_SERVICE_URL}/api/orders/${order.id}`, { status: "CANCELLED" }, {
//         headers: checkoutHeaders,
//         timeout: 3000
//       }).catch((compensationError) => {
//         console.error("Checkout compensation failed:", compensationError);
//       });
//     }
//     await session.update({
//       status: "FAILED",
//       context: { ...session.context, reason: error.response?.data?.error || error.message }
//     });
//     const status = error.response?.status || error.status || 503;
//     res.status(status).json({
//       error: error.response?.data?.error
//         || (status === 503 ? "A checkout dependency is unavailable; try again shortly." : error.message)
//     });
//   }
// });
import { Router } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { CheckoutSession } from "../models/CheckoutSession.js";
import { sequelize } from "../db.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware.js";

export const router = Router();
router.use(requireAuth);

export const checkoutInputSchema = z.object({
  shippingAddress: z.object({
    recipient: z.string().min(2),
    phone: z.string().min(8),
    line1: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    pinCode: z.string().regex(/^\d{6}$/)
  }),
  method: z.enum(["COD", "UPI", "CARD", "NET_BANKING"]),
  couponCode: z.string().trim().max(40).optional(),
  paymentId: z.string().optional() // <--- Puthusa add panniyachu
});

router.get("/", async (req, res, next) => {
  try {
    const sessions = await CheckoutSession.findAll({
      where: { userId: req.user.sub },
      order: [["createdAt", "DESC"]],
      limit: 50
    });
    res.json(sessions);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  const input = checkoutInputSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: "Invalid checkout request", details: input.error.issues });

  const token = jwt.sign({ sub: req.user.sub, role: req.user.role }, config.JWT_SECRET, { expiresIn: "2m" });
  const headers = { Authorization: `Bearer ${token}` };
  const serviceToken = jwt.sign({ sub: req.user.sub, role: "CHECKOUT" }, config.JWT_SECRET, { expiresIn: "2m" });
  const checkoutHeaders = { Authorization: `Bearer ${serviceToken}` };
  const session = await CheckoutSession.create({
    userId: req.user.sub,
    status: "STARTED",
    context: { method: input.data.method }
  });
  const reservations = [];
  let order;

  try {
    const cart = (await axios.get(`${config.CART_SERVICE_URL}/api/cart`, { headers, timeout: 5000 })).data;
    if (!cart.items?.length) throw Object.assign(new Error("Cart is empty"), { status: 400 });

    const lines = [];
    for (const line of cart.items) {
      const product = (await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products/${line.productId}`, { timeout: 5000 })).data;
      if (!product.active) throw Object.assign(new Error("A cart product is no longer available"), { status: 409 });
      await axios.post(`${config.INVENTORY_SERVICE_URL}/api/inventory/reserve`, {
        productId: line.productId,
        quantity: line.quantity
      }, { headers: checkoutHeaders, timeout: 5000 });
      reservations.push({ productId: line.productId, quantity: line.quantity });
      lines.push({
        productId: line.productId,
        name: product.name,
        quantity: line.quantity,
        unitPricePaise: product.pricePaise
      });
    }

    const totalPaise = lines.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
    order = (await axios.post(`${config.ORDER_SERVICE_URL}/api/orders`, {
      status: "PLACED",
      items: lines,
      totalPaise,
      shippingAddress: input.data.shippingAddress
    }, { headers: checkoutHeaders })).data;

    let payment = null;
    if (input.data.method !== "COD") {
      // 404 Error kodutha Axios calls-a thookiyachu
      // Frontend-la irunthu vara Stripe payment ID-a apdiye set pandrom
      payment = { id: input.data.paymentId };
    }

    await axios.delete(`${config.CART_SERVICE_URL}/api/cart`, { headers, timeout: 5000 });
    await session.update({
      orderId: order.id,
      status: "COMPLETED",
      totalPaise,
      context: { method: input.data.method, ...(payment ? { paymentId: payment.id } : {}) }
    });
    res.status(201).json({
      session,
      order,
      payment,
      paymentNotice: input.data.method === "COD"
        ? "Cash on Delivery selected."
        : "Payment intent is pending a configured payment provider; no card details were collected."
    });
  } catch (error) {
    for (const reservation of reservations) {
      await axios.post(`${config.INVENTORY_SERVICE_URL}/api/inventory/release`, reservation, {
        headers: checkoutHeaders,
        timeout: 3000
      }).catch((compensationError) => {
        console.error("Checkout compensation failed:", compensationError);
      });
    }
    if (order) {
      await axios.patch(`${config.ORDER_SERVICE_URL}/api/orders/${order.id}`, { status: "CANCELLED" }, {
        headers: checkoutHeaders,
        timeout: 3000
      }).catch((compensationError) => {
        console.error("Checkout compensation failed:", compensationError);
      });
    }
    await session.update({
      status: "FAILED",
      context: { ...session.context, reason: error.response?.data?.error || error.message }
    });
    const status = error.response?.status || error.status || 503;
    res.status(status).json({
      error: error.response?.data?.error
        || (status === 503 ? "A checkout dependency is unavailable; try again shortly." : error.message)
    });
  }
});