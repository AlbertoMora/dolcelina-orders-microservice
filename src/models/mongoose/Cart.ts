import mongoose, { Schema } from 'mongoose';
import { product } from '../mariadb/product';

export interface ICartItem extends Pick<product, 'id' | 'title' | 'price' | 'primary_image_id'> {
    quantity: number;
}

export interface ICart extends Document {
    email?: string;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

export const CartSchema: Schema = new mongoose.Schema({
    userId: { type: String, required: false },
    email: { type: String, required: false },
    items: { type: Array, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
});

const Cart = mongoose.model<ICart>('Cart', CartSchema);

export default Cart;
