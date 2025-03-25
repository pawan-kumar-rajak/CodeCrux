import { Coupon } from '../models/coupan.model.js';
import { ApiError } from './ApiError.js';

export const applyCoupon = async (totalPrice, couponCode) => {
  const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

  if (!coupon) throw new ApiError(401,'Invalid or expired coupon code.');

  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validTill)
    throw new ApiError(500,'Coupon is not valid at this time.');

  if (totalPrice < coupon.minPurchase)
    throw new ApiError(401,`Minimum purchase of ₹${coupon.minPurchase} required.`);

  let discount = 0;

  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue;
  } else if (coupon.discountType === 'percentage') {
    discount = (totalPrice * coupon.discountValue) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount); // Cap the discount at maxDiscount
    }
  }

  return Math.min(discount, totalPrice); // Ensure discount doesn't exceed total price
};
