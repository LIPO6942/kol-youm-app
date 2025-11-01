"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TryOnPanelProps = {
  basePhotoUrl?: string | null;
  topImage?: string | null;
  bottomImage?: string | null;
  onClose: () => void;
};

export default function TryOnPanel({ basePhotoUrl, topImage, bottomImage, onClose }: TryOnPanelProps) {
  const [topX, setTopX] = useState(0);
  const [topY, setTopY] = useState(0);
  const [topScale, setTopScale] = useState(1);
  const [topRotate, setTopRotate] = useState(0);

  const [botX, setBotX] = useState(0);
  const [botY, setBotY] = useState(0);
  const [botScale, setBotScale] = useState(1);
  const [botRotate, setBotRotate] = useState(0);

  const canRender = useMemo(() => !!basePhotoUrl && (!!topImage || !!bottomImage), [basePhotoUrl, topImage, bottomImage]);

  const resetTransforms = () => {
    setTopX(0); setTopY(0); setTopScale(1); setTopRotate(0);
    setBotX(0); setBotY(0); setBotScale(1); setBotRotate(0);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Essayage virtuel</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetTransforms}>Réinitialiser</Button>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canRender && (
          <div className="text-center text-muted-foreground">
            <p>Ajoutez une photo plein pied dans votre profil, puis générez le haut et/ou le bas pour l'essayer.</p>
          </div>
        )}

        {canRender && (
          <div className="w-full flex flex-col md:flex-row gap-6">
            <div className="relative w-full md:w-2/3 border rounded-lg overflow-hidden bg-black/5">
              {/* Base user photo */}
              <img src={basePhotoUrl || ""} alt="Vous" className="w-full h-auto block" />

              {/* Overlays */}
              {topImage && (
                <img
                  src={topImage}
                  alt="Haut"
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${topX}px)`,
                    top: `calc(30% + ${topY}px)`,
                    transform: `translate(-50%, -50%) scale(${topScale}) rotate(${topRotate}deg)`,
                    transformOrigin: "center",
                    pointerEvents: "none",
                  }}
                />
              )}
              {bottomImage && (
                <img
                  src={bottomImage}
                  alt="Bas"
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${botX}px)`,
                    top: `calc(65% + ${botY}px)`,
                    transform: `translate(-50%, -50%) scale(${botScale}) rotate(${botRotate}deg)`,
                    transformOrigin: "center",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>

            <div className="w-full md:w-1/3 space-y-6">
              <div className="space-y-3">
                <div className="font-semibold">Haut</div>
                <Range label="X" value={topX} setValue={setTopX} min={-200} max={200} />
                <Range label="Y" value={topY} setValue={setTopY} min={-200} max={200} />
                <Range label="Échelle" value={topScale} setValue={setTopScale} min={0.2} max={2} step={0.01} />
                <Range label="Rotation" value={topRotate} setValue={setTopRotate} min={-45} max={45} />
              </div>
              <div className="space-y-3">
                <div className="font-semibold">Bas</div>
                <Range label="X" value={botX} setValue={setBotX} min={-200} max={200} />
                <Range label="Y" value={botY} setValue={setBotY} min={-200} max={200} />
                <Range label="Échelle" value={botScale} setValue={setBotScale} min={0.2} max={2} step={0.01} />
                <Range label="Rotation" value={botRotate} setValue={setBotRotate} min={-45} max={45} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter />
    </Card>
  );
}

function Range({ label, value, setValue, min, max, step = 1 }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step?: number; }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}</span></div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
