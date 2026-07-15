import Image from "next/image";

type HeroPoster = { id: string; url: string; alt: string };

const MIN_ROW_LENGTH = 6;

const ROW_CONFIG = [
  { duration: 88, reverse: false },
  { duration: 66, reverse: true },
  { duration: 104, reverse: false },
] as const;

export function HeroPosterWall({ posters }: { posters: HeroPoster[] }) {
  const rows = splitIntoRows(posters, ROW_CONFIG.length);
  if (rows.every((row) => row.length < MIN_ROW_LENGTH)) return null;

  return (
    <div
      aria-hidden
      className="hero-marquee-wall pointer-events-auto absolute inset-0 flex flex-col justify-center gap-3 overflow-hidden py-4 sm:gap-4"
    >
      {rows.map((row, i) => {
        if (row.length < MIN_ROW_LENGTH) return null;
        const config = ROW_CONFIG[i % ROW_CONFIG.length];
        const track = [...row, ...row];
        return (
          <div
            key={i}
            className="hero-marquee-track flex w-max shrink-0 gap-3 sm:gap-4"
            style={{
              animationDuration: `${config.duration}s`,
              animationDirection: config.reverse ? "reverse" : "normal",
            }}
          >
            {track.map((poster, idx) => (
              <div
                key={`${poster.id}-${idx}`}
                className="relative h-28 w-[74px] shrink-0 overflow-hidden rounded-md bg-surface opacity-80 sm:h-40 sm:w-[104px]"
              >
                <Image src={poster.url} alt="" fill sizes="120px" className="object-cover" />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function splitIntoRows<T>(items: T[], rowCount: number): T[][] {
  const rows: T[][] = Array.from({ length: rowCount }, () => []);
  items.forEach((item, i) => rows[i % rowCount].push(item));
  return rows;
}
