/**
 * Geometry constants for the GPCRome map, in a plain (non-"use client") module
 * so both the server component (which computes the spoke endpoints) and the
 * client component (which draws the SVG frame) import the real numeric values.
 *
 * Importing these from the "use client" component instead would hand the server
 * client-reference proxies rather than numbers, yielding NaN coordinates.
 */
export const SIZE = 440;
export const CENTER = SIZE / 2;
export const INNER = 78;
