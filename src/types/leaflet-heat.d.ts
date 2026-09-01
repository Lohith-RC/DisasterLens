// leaflet.heat type shim
declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  export interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: [number, number, number?][]): this;
    addLatLng(latlng: [number, number, number?]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }
  export interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }
  export function heatLayer(
    latlngs: [number, number, number?][],
    options?: HeatLayerOptions
  ): HeatLayer;
}
