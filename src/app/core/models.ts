export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  position: LatLng;
  address: string;
}
export type ServiceType = 'eco' | 'plus' | 'bike';

export interface RouteInfo {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RideOption {
  type: ServiceType;
  title: string;
  price: number;
  etaMinutes: number;
}

export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'onboard' | 'finished' | 'cancelled';

export interface Driver {
  name: string;
  car: string;
  plate: string;
  rating: number;
  position: LatLng;
}

export interface Ride {
  id: string;
  status: RideStatus;
  option: RideOption;
  origin: Place;
  destination: Place;
  driver?: Driver;
  passengerName?: string;
  driverPhone?: string;
}
export type UserRole = 'passenger' | 'driver';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  car?: string;
  plate?: string;
}

