import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Upload, FolderOpen, FileArchive, AlertTriangle, CheckCircle2, XCircle, ChevronRight, ChevronDown, Bug } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  extractZip, extractFolder, validateFileMap, convertSketchUp,
  type FileMap, type ValidationResult, type ConversionProgress, type ConversionResult, type TargetDevice, type DebugInfo,
} from '@/lib/sketchupImport';

type Step = 'pick' | 'validate' | 'settings' | 'converting' | 'done' | 'error';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'bmp']);
const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

function FileDebugPanel({ fileMap, validation }: { fileMap: FileMap; validation: ValidationResult }) {
  const objCount = [...fileMap.files.keys()].filter(p => getExt(p) === 'obj').length;
  const daeCount = [...fileMap.files.keys()].filter(p => getExt(p) === 'dae').length;
  const mtlCount = [...fileMap.files.keys()].filter(p => getExt(p) === 'mtl').length;
  const texCount = [...fileMap.files.keys()].filter(p => IMAGE_EXTS.has(getExt(p))).length;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full">
        <Bug size={10} />
        <span>Debug info</span>
        <ChevronDown size={10} className="ml-auto" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded border border-border bg-secondary/30 p-2 text-[9px] font-mono text-muted-foreground space-y-0.5">
          <div>Filer totalt: {fileMap.files.size}</div>
          <div>OBJ: {objCount} | DAE: {daeCount} | MTL: {mtlCount} | Texturer: {texCount}</div>
          <div>Huvudfil: {validation.mainFile ?? '—'}</div>
          {validation.mainFile && validation.fileSizes.has(validation.mainFile) && (
            <div>Storlek: {formatBytes(validation.fileSizes.get(validation.mainFile)!)}</div>
          )}
          {validation.multipleObjFiles.length > 1 && (
            <div>OBJ-filer (sorterade efter storlek):
              {validation.multipleObjFiles.map(f => (
                <div key={f} className="pl-2">
                  {f.split('/').pop()} ({formatBytes(validation.fileSizes.get(f) ?? 0)})
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ConversionDebugPanel({ debugInfo }: { debugInfo: DebugInfo }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full">
        <Bug size={10} />
        <span>Konverteringsdetaljer</span>
        <ChevronDown size={10} className="ml-auto" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded border border-border bg-secondary/30 p-2 text-[9px] font-mono text-muted-foreground space-y-0.5">
          <div>Root: {debugInfo.rootType} | Children: {debugInfo.childrenCount}</div>
          <div>Meshes: {debugInfo.meshCount} | Trianglar: {debugInfo.triangleCount.toLocaleString()}</div>
          <div>BBox: {debugInfo.boundingBox.x} × {debugInfo.boundingBox.y} × {debugInfo.boundingBox.z}</div>
          {debugInfo.missingResources.length > 0 && (
            <div className="text-yellow-400">
              <div>Saknade resurser ({debugInfo.missingResources.length}):</div>
              {debugInfo.missingResources.map((r, i) => (
                <div key={i} className="pl-2 truncate">{r}</div>
              ))}
            </div>
          )}
          {debugInfo.missingResources.length === 0 && (
            <div className="text-green-400">Alla resurser hittades ✓</div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function SketchUpWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [fileMap, setFileMap] = useState<FileMap | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [target, setTarget] = useState<TargetDevice>('tablet');
  const [progress, setProgress] = useState<ConversionProgress>({ stage: 'extracting', percent: 0, message: '' });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedObj, setSelectedObj] = useState<string | null>(null);

  const zipRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);

  const reset = () => {
    setStep('pick');
    setFileMap(null);
    setValidation(null);
    setResult(null);
    setErrorMsg('');
    setSelectedObj(null);
    setProgress({ stage: 'extracting', percent: 0, message: '' });
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const processFiles = useCallback(async (fm: FileMap) => {
    setFileMap(fm);
    const v = validateFileMap(fm);
    setValidation(v);
    if (!v.valid) {
      setErrorMsg(v.errors.join('\n'));
      setStep('error');
    } else if (v.multipleObjFiles.length > 1) {
      setSelectedObj(v.multipleObjFiles[0]);
      setStep('validate');
    } else {
      setStep('validate');
    }
  }, []);

  const handleZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const fm = await extractZip(buf);
      await processFiles(fm);
    } catch (err) {
      setErrorMsg(`Kunde inte läsa ZIP-filen: ${(err as Error).message}`);
      setStep('error');
    }
    e.target.value = '';
  };

  const handleFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const fm = await extractFolder(files);
      await processFiles(fm);
    } catch (err) {
      setErrorMsg(`Kunde inte läsa mappen: ${(err as Error).message}`);
      setStep('error');
    }
    e.target.value = '';
  };

  const startConversion = async () => {
    if (!fileMap || !validation) return;
    setStep('converting');
    try {
      const res = await convertSketchUp(fileMap, validation, target, setProgress, selectedObj || undefined);
      setResult(res);
      setStep('done');
    } catch (err) {
      setErrorMsg(`Konvertering misslyckades: ${(err as Error).message}`);
      setStep('error');
    }
  };

  const importResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.glbBlob);
    const sizeBytes = result.optimizedSize;
    const MAX_PERSIST_SIZE = 4 * 1024 * 1024;
    
    if (sizeBytes > MAX_PERSIST_SIZE) {
      console.log(`[SketchUp Import] GLB ${(sizeBytes / 1024 / 1024).toFixed(1)} MB > 4 MB, skipping base64 persistence`);
      setImportedModel({
        url,
        modelStats: result.stats,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
      });
      setHomeGeometrySource('imported');
      handleClose(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImportedModel({
        url,
        fileData: base64,
        modelStats: result.stats,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
      });
      setHomeGeometrySource('imported');
      handleClose(false);
    };
    reader.onerror = () => {
      setImportedModel({ url, modelStats: result.stats, originalSize: result.originalSize, optimizedSize: result.optimizedSize });
      setHomeGeometrySource('imported');
      handleClose(false);
    };
    reader.readAsDataURL(result.glbBlob);
  };

  const getBasenameFn = (p: string) => p.split('/').pop()?.split('\\').pop() ?? p;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Importera SketchUp</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Konvertera OBJ/DAE + texturer till optimerad GLB
          </DialogDescription>
        </DialogHeader>

        {/* Step: Pick */}
        {step === 'pick' && (
          <div className="space-y-3">
            <button
              onClick={() => zipRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[52px]"
            >
              <FileArchive size={20} />
              <div className="text-left">
                <div className="font-medium text-foreground">Ladda upp ZIP</div>
                <div className="text-[10px]">ZIP-fil med OBJ/DAE + texturer</div>
              </div>
            </button>
            <input ref={zipRef} type="file" accept=".zip,.rar,.7z" className="hidden" onChange={handleZip} />

            <button
              onClick={() => folderRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[52px]"
            >
              <FolderOpen size={20} />
              <div className="text-left">
                <div className="font-medium text-foreground">Välj mapp</div>
                <div className="text-[10px]">Mapp med SketchUp-export</div>
              </div>
            </button>
            {/* @ts-ignore - webkitdirectory is non-standard */}
            <input ref={folderRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleFolder} />
          </div>
        )}

        {/* Step: Validate */}
        {step === 'validate' && validation && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-foreground font-medium">
                  {validation.format === 'dae' ? 'Collada (DAE)' : 'OBJ/MTL'} hittad
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Huvudfil: {getBasenameFn(validation.mainFile!)}</div>
                {validation.mtlFile && <div>Material: {getBasenameFn(validation.mtlFile)}</div>}
                <div>Texturer: {validation.textureFiles.length} filer</div>
                <div>Total storlek: {formatBytes(fileMap?.totalSize ?? 0)}</div>
              </div>
            </div>

            {/* Multiple OBJ picker */}
            {validation.multipleObjFiles.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground">Flera OBJ-filer — välj huvudfil (sorterade efter storlek):</span>
                {validation.multipleObjFiles.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-[10px] cursor-pointer">
                    <input
                      type="radio" name="objPick"
                      checked={selectedObj === f}
                      onChange={() => setSelectedObj(f)}
                      className="accent-primary"
                    />
                    <span className={selectedObj === f ? 'text-foreground' : 'text-muted-foreground'}>
                      {getBasenameFn(f)} ({formatBytes(validation.fileSizes.get(f) ?? 0)})
                    </span>
                  </label>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-1">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-yellow-400">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Debug panel for validation step */}
            {fileMap && <FileDebugPanel fileMap={fileMap} validation={validation} />}

            <button
              onClick={() => setStep('settings')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all min-h-[44px]"
            >
              Nästa <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Step: Settings */}
        {step === 'settings' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Målenhet</h4>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-xs text-foreground font-medium">
                    {target === 'tablet' ? '📱 Surfplatta / RPi' : '🖥️ Desktop'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {target === 'tablet' ? 'Max 1024px texturer, aggressiv komprimering' : 'Max 2048px texturer, lättare komprimering'}
                  </div>
                </div>
                <Switch
                  checked={target === 'desktop'}
                  onCheckedChange={(v) => setTarget(v ? 'desktop' : 'tablet')}
                />
              </div>
            </div>

            <button
              onClick={startConversion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all min-h-[44px]"
            >
              Konvertera till GLB <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Step: Converting */}
        {step === 'converting' && (
          <div className="space-y-4 py-2">
            <Progress value={progress.percent} className="h-2" />
            <div className="text-center space-y-1">
              <div className="text-xs text-foreground font-medium">{progress.message}</div>
              <div className="text-[10px] text-muted-foreground">{progress.percent}%</div>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 size={16} />
              <span className="font-medium">Konvertering klar!</span>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-muted-foreground">Original</span>
                <span className="text-foreground text-right">{formatBytes(result.originalSize)}</span>
                <span className="text-muted-foreground">Optimerad GLB</span>
                <span className="text-foreground text-right">{formatBytes(result.optimizedSize)}</span>
                <span className="text-muted-foreground">Trianglar</span>
                <span className="text-foreground text-right">{result.stats.triangles.toLocaleString()}</span>
                <span className="text-muted-foreground">Material</span>
                <span className="text-foreground text-right">{result.stats.materials}</span>
                <span className="text-muted-foreground">Texturer</span>
                <span className="text-foreground text-right">{result.stats.textures}</span>
              </div>
              <div className="flex justify-end">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  result.stats.rating === 'ok' ? 'bg-green-500/20 text-green-400' :
                  result.stats.rating === 'heavy' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {result.stats.rating === 'ok' ? '✓ OK' : result.stats.rating === 'heavy' ? '⚠ Tung' : '✗ För tung'}
                </span>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-lg bg-secondary/30 p-2.5 space-y-1 max-h-24 overflow-y-auto">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-yellow-400">
                    <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Debug panel for done step */}
            {result.debugInfo && <ConversionDebugPanel debugInfo={result.debugInfo} />}

            <button
              onClick={importResult}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all min-h-[44px]"
            >
              Importera i scenen
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs text-red-400">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{errorMsg}</span>
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-lg bg-secondary text-foreground text-xs hover:bg-secondary/80 transition-all min-h-[44px]"
            >
              Försök igen
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
