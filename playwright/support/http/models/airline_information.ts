export interface AirlineInformation {
    bookingItems: BookingItem[];
}

export interface BookingItem {
    eTicket: boolean;
    legs: Leg[];
    passenger: Passenger;
    ticketNumber: string;
}

export interface Leg {
    carrierCode: string;
    destination: Destination;
    flightNumber: string;
    origin: Origin;
    serviceClass: string;
    stopoverCode: string;
}

export interface Destination {
    iataCode: string;
}

export interface Origin {
    date: string;
    iataCode: string;
    time: string;
}

export interface Passenger {
    firstName: string;
    lastName: string;
    type: string;
}

