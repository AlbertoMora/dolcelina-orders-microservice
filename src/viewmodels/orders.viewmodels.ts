import { IQueryViewModel } from '../types/commons.types';

export interface IGetOrdersQueryViewModel extends IQueryViewModel {
    email?: string;
    status?: string;
    payment_method?: string;
    min_date?: string;
    max_date?: string;
}

export interface ICreateOrderItemViewModel {
    product_id: string;
    quantity: number;
    price: number;
}

export interface ICreateOrderViewModel {
    email?: string;
    total: number;
    status: string;
    payment_method?: string;
    shipping_address_id?: string;
    items?: ICreateOrderItemViewModel[];
}

export interface IUpdateOrderViewModel {
    email?: string;
    total?: number;
    status?: string;
    payment_method?: string;
    shipping_address_id?: string;
}

export interface ICompletePaymentViewModel {
    payment_id?: string;
    sinpe_url?: string;
    cart_id?: string;
    address: IAddressViewModel;
}

export interface IAddressViewModel {
    id?: string;
    email: string;
    one_line_address: string;
    city: string;
    state: string;
    postal_code: string;
    additional_info?: string;
}
