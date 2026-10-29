import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type { LatLng } from '../../core/models';

const TEHRAN: LatLng = { lat: 35.6892, lng: 51.389 };
const ROUTE_COLOR = '#00b96b';
const FIT_PADDING_TOP_LEFT: L.PointTuple = [40, 40];
const FIT_PADDING_BOTTOM_RIGHT: L.PointTuple = [40, 260];

@Component({
  selector: 'app-map',
  template: '<div #mapEl class="map"></div>',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnDestroy {
  readonly center = input<LatLng>(TEHRAN);
  readonly zoom = input(13);
  readonly userPosition = input<LatLng | null>(null);
  readonly origin = input<LatLng | null>(null);
  readonly destination = input<LatLng | null>(null);
  readonly route = input<LatLng[] | null>(null);
  readonly driverPosition = input<LatLng | null>(null);

  readonly centerChange = output<LatLng>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private readonly map = signal<L.Map | null>(null);
  private userMarker?: L.Marker;
  private originMarker?: L.Marker;
  private destinationMarker?: L.Marker;
  private driverMarker?: L.Marker;
  private routeLine?: L.Polyline;
  private resizeObserver?: ResizeObserver;
  private resizing = false;

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const map = this.map();
      const pos = this.userPosition();
      if (!map || !pos) return;
      this.userMarker = this.syncMarker(map, this.userMarker, pos, '👤');
      map.flyTo([pos.lat, pos.lng], 16);
    });

    effect(() => {
      const map = this.map();
      const pos = this.origin();
      if (!map) return;
      this.originMarker = this.syncMarker(map, this.originMarker, pos, '📍');
    });

    effect(() => {
      const map = this.map();
      const pos = this.destination();
      if (!map) return;
      this.destinationMarker = this.syncMarker(map, this.destinationMarker, pos, '📍', 30, 'destination-pin');
    });

    effect(() => {
      const map = this.map();
      const coords = this.route();
      if (!map) return;
      this.drawRoute(map, coords);
    });

    effect(() => {
      const map = this.map();
      const pos = this.driverPosition();
      if (!map) return;
      this.driverMarker = this.syncMarker(map, this.driverMarker, pos, '🚗', 34);
    });
  }

  flyTo(pos: LatLng, zoom = 16) {
    this.map()?.flyTo([pos.lat, pos.lng], zoom);
  }

  private initMap() {
    const el = this.mapEl().nativeElement;
    const c = this.center();

    const map = L.map(el).setView([c.lat, c.lng], this.zoom());

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('moveend', () => {
      if (!this.resizing) this.emitCenter(map);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.resizing = true;
      map.invalidateSize();
      this.resizing = false;
    });
    this.resizeObserver.observe(el);

    this.map.set(map);
    this.emitCenter(map);
  }

  private drawRoute(map: L.Map, coords: LatLng[] | null) {
    this.routeLine?.remove();
    this.routeLine = undefined;
    if (!coords?.length) return;

    this.routeLine = L.polyline(
      coords.map((point) => [point.lat, point.lng] as L.LatLngTuple),
      { color: ROUTE_COLOR, weight: 5, opacity: 0.9 },
    ).addTo(map);

    map.fitBounds(this.routeLine.getBounds(), {
      paddingTopLeft: FIT_PADDING_TOP_LEFT,
      paddingBottomRight: FIT_PADDING_BOTTOM_RIGHT,
    });
  }

  private emitCenter(map: L.Map) {
    const c = map.getCenter();
    this.centerChange.emit({ lat: c.lat, lng: c.lng });
  }

  private syncMarker(
    map: L.Map,
    marker: L.Marker | undefined,
    pos: LatLng | null,
    emoji: string,
    size = 20,
    markerClass = '',
  ): L.Marker | undefined {
    if (!pos) {
      marker?.remove();
      return undefined;
    }

    const latlng: L.LatLngExpression = [pos.lat, pos.lng];

    if (marker) {
      marker.setLatLng(latlng);
      return marker;
    }

    return L.marker(latlng, {
      icon: L.divIcon({ className: `emoji-map-marker ${markerClass}`, html: emoji, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
      interactive: false,
    }).addTo(map);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.map()?.remove();
  }
}
