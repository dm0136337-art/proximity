"use client";

import "./infinite-slider.css";
import Image from "next/image";

type InfiniteSliderProps = {
  gap?: number;
  duration?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
};

const studios = [
  { name: "WARNER BROS. PICTURES", logo: "/logos/warner-bros.svg" },
  { name: "UNIVERSAL PICTURES", logo: "/logos/universal-pictures.svg" },
  { name: "SONY PICTURES", logo: "/logos/sony-pictures.svg" },
  { name: "PARAMOUNT", logo: "/logos/paramount-pictures.svg" },
  { name: "LIONSGATE", logo: "/logos/lionsgate.svg" },
  { name: "NETFLIX", logo: "/logos/netflix.svg" },
  { name: "A24", logo: "/logos/a24.svg" },
  { name: "LEGENDARY", logo: "/logos/legendary-entertainment.svg" },
];

export function InfiniteSlider({
  gap = 64,
  duration = 32,
  reverse = false,
  pauseOnHover = true,
}: InfiniteSliderProps) {
  return (
    <section
      aria-label="Production company and film studio names"
      className="overflow-hidden py-5 sm:py-7"
    >
      <div
        className={`production-slider-track flex w-max ${reverse ? "production-slider-reverse" : ""} ${pauseOnHover ? "production-slider-slow-hover" : ""}`}
        style={{ "--slider-gap": `${gap}px`, "--slider-duration": `${duration}s` } as React.CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
            style={{ gap }}
          >
            {studios.map((studio) => (
              <div key={studio.name} className="flex flex-col items-center gap-2">
                <span className="production-slider-logo-frame" aria-hidden="true">
                  <Image
                    src={studio.logo}
                    alt=""
                    fill
                    sizes="32px"
                    className="production-slider-logo"
                  />
                </span>
                <span className="whitespace-nowrap text-center text-xs font-semibold tracking-[0.2em] text-white/55 sm:text-sm sm:tracking-[0.24em]">
                  {studio.name}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
