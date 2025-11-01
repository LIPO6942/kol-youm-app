"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateOutfitImage } from "@/ai/flows/generate-outfit-image-hf";

type TryOnPanelProps = {
  basePhotoUrl?: string | null;
  closeupPhotoUrl?: string | null;
  gender?: 'Homme' | 'Femme';
  topImage?: string | null;
  bottomImage?: string | null;
  topDescription?: string | null;
  bottomDescription?: string | null;
  onClose: () => void;
};

export default function TryOnPanel({ basePhotoUrl, closeupPhotoUrl, gender, topImage, bottomImage, topDescription, bottomDescription, onClose }: TryOnPanelProps) {
  // Base image controls
  const [useCloseup, setUseCloseup] = useState(false);
  const activeBase = useCloseup ? (closeupPhotoUrl || "") : (basePhotoUrl || "");
  const [baseX, setBaseX] = useState(0);
  const [baseY, setBaseY] = useState(0);
  const [baseScale, setBaseScale] = useState(1);

  // Overlay controls
  const [topX, setTopX] = useState(0);
  const [topY, setTopY] = useState(0);
  const [topScale, setTopScale] = useState(1);
  const [topRotate, setTopRotate] = useState(0);

  const [botX, setBotX] = useState(0);
  const [botY, setBotY] = useState(0);
  const [botScale, setBotScale] = useState(1);
  const [botRotate, setBotRotate] = useState(0);

  // Images local state (so we can generate if missing)
  const [topImg, setTopImg] = useState<string | null>(topImage || null);
  const [botImg, setBotImg] = useState<string | null>(bottomImage || null);
  useEffect(() => { setTopImg(topImage || null); }, [topImage]);
  useEffect(() => { setBotImg(bottomImage || null); }, [bottomImage]);

  const canRender = useMemo(
    () => !!activeBase && (!!topImg || !!botImg),
    [activeBase, topImg, botImg]
  );

  const resetTransforms = () => {
    setBaseX(0); setBaseY(0); setBaseScale(1);
    setTopX(0); setTopY(0); setTopScale(1); setTopRotate(0);
    setBotX(0); setBotY(0); setBotScale(1); setBotRotate(0);
  };

  const handleGenerateTop = async () => {
    if (!topDescription) return;
    const { imageDataUri } = await generateOutfitImage({ itemDescription: topDescription, gender, category: 'haut' });
    setTopImg(imageDataUri);
  };
  const handleGenerateBottom = async () => {
    if (!bottomDescription) return;
    const { imageDataUri } = await generateOutfitImage({ itemDescription: bottomDescription, gender, category: 'bas' });
    setBotImg(imageDataUri);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Essayage virtuel</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUseCloseup(v => !v)}>
            {useCloseup ? 'Utiliser photo en pied' : 'Utiliser photo de près'}
          </Button>
          <Button variant="outline" onClick={resetTransforms}>Réinitialiser</Button>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeBase && (
          <div className="text-center text-muted-foreground">
            <p>Ajoutez une photo ({useCloseup ? 'de près' : 'plein pied'}) dans vos paramètres.</p>
          </div>
        )}

        <div className="w-full flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-2/3 border rounded-lg overflow-hidden bg-black/5">
            {/* Base user photo with pan/zoom */}
            {activeBase && (
              <img
                src={activeBase}
                alt="Vous"
                style={{
                  width: '100%',
                  height: 'auto',
                  transform: `translate(${baseX}px, ${baseY}px) scale(${baseScale})`,
                  transformOrigin: 'center top',
                }}
              />)
            }

            {/* Overlays */}
            {topImg && (
              <img
                src={topImg}
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
            {botImg && (
              <img
                src={botImg}
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
              <div className="font-semibold">Photo {useCloseup ? 'de près' : 'en pied'}</div>
              <Range label="X" value={baseX} setValue={setBaseX} min={-200} max={200} />
              <Range label="Y" value={baseY} setValue={setBaseY} min={-200} max={200} />
              <Range label="Zoom" value={baseScale} setValue={setBaseScale} min={0.5} max={2} step={0.01} />
            </div>

            <div className="space-y-3">
              <div className="font-semibold">Haut</div>
              {!topImg && topDescription && <Button size="sm" variant="secondary" onClick={handleGenerateTop}>Générer le haut</Button>}
              <Range label="X" value={topX} setValue={setTopX} min={-200} max={200} />
              <Range label="Y" value={topY} setValue={setTopY} min={-200} max={200} />
              <Range label="Échelle" value={topScale} setValue={setTopScale} min={0.2} max={2} step={0.01} />
              <Range label="Rotation" value={topRotate} setValue={setTopRotate} min={-45} max={45} />
            </div>
            <div className="space-y-3">
              <div className="font-semibold">Bas</div>
              {!botImg && bottomDescription && <Button size="sm" variant="secondary" onClick={handleGenerateBottom}>Générer le bas</Button>}
              <Range label="X" value={botX} setValue={setBotX} min={-200} max={200} />
              <Range label="Y" value={botY} setValue={setBotY} min={-200} max={200} />
              <Range label="Échelle" value={botScale} setValue={setBotScale} min={0.2} max={2} step={0.01} />
              <Range label="Rotation" value={botRotate} setValue={setBotRotate} min={-45} max={45} />
            </div>
          </div>
        </div>
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
