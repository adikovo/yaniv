import './styles.css';

/**
 * Animated neon background for the menu/setup screens (feature 014, R3):
 * a drifting cyan grid, three floating glow orbs, and a faint scanline
 * overlay. CSS-only (uses the gridDrift/orbFloat keyframes from index.css).
 * Decorative — pointer-events: none, hidden from assistive tech.
 */
export const ParticleGrid = () => (
    <div className="particle-grid" aria-hidden="true">
        <div className="particle-grid__grid" />
        <div className="particle-grid__orb particle-grid__orb--cyan" />
        <div className="particle-grid__orb particle-grid__orb--magenta" />
        <div className="particle-grid__orb particle-grid__orb--purple" />
        <div className="particle-grid__scanlines" />
    </div>
);
