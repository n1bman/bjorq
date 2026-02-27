import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Upload, FolderOpen, FileArchive, AlertTriangle, CheckCircle2, XCircle, ChevronRight, ChevronDown, Bug, Server, Monitor, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  extractZip, extractFolder, validateFileMap, convertSketchUp,
  testLoadOnly, testGLBExportSanity, buildZipFromFileMap,
  type FileMap, type ValidationResult, type ConversionProgress, type ConversionResult, type TargetDevice, type DebugInfo, type LoaderTestResult,
} from '@/lib/sketchupImport';
import {
  getHABaseUrl, checkAddonAvailable, uploadForConversion,
  pollConversionStatus, downloadResult,
} from '@/lib/haConverterApi';
import { analyzeModel } from '@/lib/modelAnalysis';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

type Step = 'pick' | 'validate' | 'mode' | 'settings' | 'converting' | 'done' | 'error';
type ConvMode = 'ha' | 'browser';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'bmp']);
const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

// ── Sub-panels (unchanged) ──

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

function LoaderTestPanel({ result }: { result: LoaderTestResult }) {
  return (
    <div className="rounded border border-border bg-secondary/30 p-2 text-[9px] font-mono text-muted-foreground space-y-0.5">
      <div className="text-[10px] font-semibold text-foreground mb-1">Loader Test Result</div>
      <div>Fil: {result.mainFile.split('/').pop()} ({formatBytes(result.mainFileSize)})</div>
      <div>Root: {result.rootType} | Children: {result.childrenCount}</div>
      <div className={result.meshCount > 0 ? 'text-green-400' : 'text-red-400'}>
        Meshes: {result.meshCount} | Trianglar: {result.triCount.toLocaleString()}
      </div>
      <div>BBox: {result.boundingBox.x} × {result.boundingBox.y} × {result.boundingBox.z}</div>
      {result.materialTypes.length > 0 && <div>Material: {result.materialTypes.join(', ')}</div>}
      {result.childTree.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Child tree ({result.childTree.length})</summary>
          <div className="pl-1 mt-0.5 space-y-0">
            {result.childTree.map((c, i) => (
              <div key={i}>{c.name} [{c.type}] ({c.children} children)</div>
            ))}
          </div>
        </details>
      )}
      {result.missingResources.length > 0 && (
        <div className="text-yellow-400 mt-1">
          Saknade resurser: {result.missingResources.join(', ')}
        </div>
      )}
    </div>
  );
}

function GLBSanityResult({ result }: { result: { success: boolean; byteLength: number; triCount: number; error?: string } }) {
  return (
    <div className={`rounded border border-border p-2 text-[9px] font-mono ${result.success ? 'text-green-400' : 'text-red-400'}`}>
      {result.success
        ? `✓ GLB Export OK — ${result.byteLength} bytes, ${result.triCount} trianglar`
        : `✗ GLB Export FAILED — ${result.error}`}
    </div>
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

// ── Main wizard ──

export default function SketchUpWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [fileMap, setFileMap] = useState<FileMap | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [target, setTarget] = useState<TargetDevice>('tablet');
  const [progress, setProgress] = useState<ConversionProgress>({ stage: 'extracting', percent: 0, message: '' });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedObj, setSelectedObj] = useState<string | null>(null);
  const [loaderTestResult, setLoaderTestResult] = useState<LoaderTestResult | null>(null);
  const [loaderTesting, setLoaderTesting] = useState(false);
  const [glbSanityResult, setGlbSanityResult] = useState<{ success: boolean; byteLength: number; triCount: number; error?: string } | null>(null);
  const [glbSanityTesting, setGlbSanityTesting] = useState(false);
  const [fastMode, setFastMode] = useState(false);

  // HA conversion state
  const [convMode, setConvMode] = useState<ConvMode>('browser');
  const [haAvailable, setHaAvailable] = useState<boolean | null>(null);
  const [haChecking, setHaChecking] = useState(false);

  const zipRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);
  const haStatus = useAppStore((s) => s.homeAssistant.status);

  // Check HA add-on availability when entering mode step
  const checkHA = useCallback(async () => {
    setHaChecking(true);
    const baseUrl = getHABaseUrl();
    const token = useAppStore.getState().homeAssistant.token;
    if (!baseUrl || !token || haStatus !== 'connected') {
      setHaAvailable(false);
      setHaChecking(false);
      return;
    }
    const available = await checkAddonAvailable(baseUrl, token);
    setHaAvailable(available);
    // Auto-select HA if available and file is large
    if (available && fileMap && fileMap.totalSize > 150 * 1024 * 1024) {
      setConvMode('ha');
    }
    setHaChecking(false);
  }, [haStatus, fileMap]);

  const reset = () => {
    setStep('pick');
    setFileMap(null);
    setValidation(null);
    setResult(null);
    setErrorMsg('');
    setSelectedObj(null);
    setLoaderTestResult(null);
    setGlbSanityResult(null);
    setFastMode(false);
    setConvMode('browser');
    setHaAvailable(null);
    setProgress({ stage: 'extracting', percent: 0, message: '' });
  };

  const runLoaderTest = async () => {
    if (!fileMap || !validation) return;
    setLoaderTesting(true);
    setLoaderTestResult(null);
    try {
      const res = await testLoadOnly(fileMap, validation, selectedObj, fastMode);
      setLoaderTestResult(res);
    } catch (err) {
      setLoaderTestResult({
        mainFile: validation.mainFile ?? '?',
        mainFileSize: 0,
        rootType: 'ERROR',
        childrenCount: 0,
        meshCount: 0,
        triCount: 0,
        boundingBox: { x: 0, y: 0, z: 0 },
        materialTypes: [],
        childTree: [],
        missingResources: [(err as Error).message],
      });
    }
    setLoaderTesting(false);
  };

  const runGLBSanity = async () => {
    setGlbSanityTesting(true);
    setGlbSanityResult(null);
    const res = await testGLBExportSanity();
    setGlbSanityResult(res);
    setGlbSanityTesting(false);
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

  // Browser conversion (existing)
  const startBrowserConversion = async () => {
    if (!fileMap || !validation) return;
    setStep('converting');
    try {
      const res = await convertSketchUp(fileMap, validation, target, setProgress, selectedObj || undefined, fastMode);
      setResult(res);
      setStep('done');
    } catch (err) {
      setErrorMsg(`Konvertering misslyckades: ${(err as Error).message}`);
      setStep('error');
    }
  };

  // HA add-on conversion
  const startHAConversion = async () => {
    if (!fileMap) return;
    setStep('converting');
    const baseUrl = getHABaseUrl();
    const token = useAppStore.getState().homeAssistant.token;
    if (!baseUrl || !token) {
      setErrorMsg('Ingen Home Assistant-anslutning hittades.');
      setStep('error');
      return;
    }

    try {
      // 1. Build ZIP
      setProgress({ stage: 'uploading', percent: 5, message: 'Bygger ZIP för uppladdning...' });
      const zipBlob = await buildZipFromFileMap(fileMap);

      // 2. Upload
      setProgress({ stage: 'uploading', percent: 10, message: 'Laddar upp till HomeTwin Converter...' });
      const { jobId } = await uploadForConversion(baseUrl, token, zipBlob, (pct) => {
        setProgress({ stage: 'uploading', percent: 10 + Math.round(pct * 0.3), message: `Laddar upp... ${pct}%` });
      });

      // 3. Poll status
      setProgress({ stage: 'remote-converting', percent: 40, message: 'Konverterar på HA...' });
      let status = await pollConversionStatus(baseUrl, token, jobId);
      while (status.state === 'queued' || status.state === 'converting') {
        await new Promise((r) => setTimeout(r, 2000));
        status = await pollConversionStatus(baseUrl, token, jobId);
        const pct = 40 + Math.round((status.percent / 100) * 40);
        setProgress({ stage: 'remote-converting', percent: pct, message: status.message || 'Konverterar...' });
      }

      if (status.state === 'error') {
        throw new Error(status.error || status.message || 'Konvertering misslyckades på HA');
      }

      // 4. Download GLB
      setProgress({ stage: 'downloading', percent: 85, message: 'Laddar ner GLB...' });
      const glbBlob = await downloadResult(baseUrl, token, jobId);
      console.log(`[SketchUp HA] Downloaded GLB: ${(glbBlob.size / 1024 / 1024).toFixed(1)} MB`);

      // 5. Load GLB to get stats
      setProgress({ stage: 'downloading', percent: 95, message: 'Analyserar resultat...' });
      const glbUrl = URL.createObjectURL(glbBlob);
      const gltf = await new Promise<any>((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(glbUrl, resolve, undefined, reject);
      });
      const stats = analyzeModel(gltf.scene);
      const { meshCount, triCount } = collectSceneStatsFromScene(gltf.scene);

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const bboxSize = box.getSize(new THREE.Vector3());

      URL.revokeObjectURL(glbUrl);

      setResult({
        glbBlob,
        stats,
        originalSize: fileMap.totalSize,
        optimizedSize: glbBlob.size,
        warnings: [],
        debugInfo: {
          rootType: 'HA Converter',
          childrenCount: gltf.scene.children.length,
          meshCount,
          triangleCount: triCount,
          boundingBox: {
            x: Math.round(bboxSize.x * 100) / 100,
            y: Math.round(bboxSize.y * 100) / 100,
            z: Math.round(bboxSize.z * 100) / 100,
          },
          missingResources: [],
        },
      });
      setProgress({ stage: 'done', percent: 100, message: 'Klar!' });
      setStep('done');
    } catch (err) {
      setErrorMsg(`HA-konvertering misslyckades: ${(err as Error).message}`);
      setStep('error');
    }
  };

  const startConversion = () => {
    if (convMode === 'ha') {
      startHAConversion();
    } else {
      startBrowserConversion();
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

            {fileMap && <FileDebugPanel fileMap={fileMap} validation={validation} />}

            {/* Fast Import toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
              <div>
                <div className="text-[11px] text-foreground font-medium">⚡ SketchUp Fast Import</div>
                <div className="text-[9px] text-muted-foreground">Geometri utan texturer — snabbare &amp; stabilare</div>
              </div>
              <Switch checked={fastMode} onCheckedChange={setFastMode} />
            </div>

            {/* Diagnostic buttons */}
            <div className="flex gap-2">
              <button
                onClick={runLoaderTest}
                disabled={loaderTesting}
                className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-[10px] font-medium hover:bg-secondary/80 transition-all min-h-[36px] disabled:opacity-50"
              >
                {loaderTesting ? 'Testar...' : '🔍 Testa laddning'}
              </button>
              <button
                onClick={runGLBSanity}
                disabled={glbSanityTesting}
                className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-[10px] font-medium hover:bg-secondary/80 transition-all min-h-[36px] disabled:opacity-50"
              >
                {glbSanityTesting ? 'Testar...' : '📦 Test GLB Export (Box)'}
              </button>
            </div>

            {loaderTestResult && <LoaderTestPanel result={loaderTestResult} />}
            {glbSanityResult && <GLBSanityResult result={glbSanityResult} />}

            <button
              onClick={() => { setStep('mode'); checkHA(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all min-h-[44px]"
            >
              Nästa <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Step: Mode selection (NEW) */}
        {step === 'mode' && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konverteringsmetod</h4>

            <RadioGroup value={convMode} onValueChange={(v) => setConvMode(v as ConvMode)} className="space-y-2">
              {/* HA option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  convMode === 'ha' ? 'border-primary bg-primary/5' : 'border-border'
                } ${!haAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value="ha" disabled={!haAvailable} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Server size={14} />
                    Konvertera via Home Assistant
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">Rekommenderas</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Hanterar stora modeller (600MB+). Kräver HomeTwin Converter add-on.
                  </div>
                </div>
              </label>

              {/* Browser option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  convMode === 'browser' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <RadioGroupItem value="browser" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Monitor size={14} />
                    Konvertera i webbläsaren
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Fungerar för små modeller (&lt;150 MB). Ingen extra setup krävs.
                  </div>
                </div>
              </label>
            </RadioGroup>

            {/* HA status info */}
            {haChecking && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Kontrollerar HomeTwin Converter...
              </div>
            )}

            {!haChecking && haAvailable === false && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5">
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                  <Info size={14} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    {haStatus !== 'connected' ? (
                      <span>Anslut till Home Assistant först (Hem → Inställningar → HA).</span>
                    ) : (
                      <span>
                        HomeTwin Converter add-on hittades inte.<br />
                        Installera via HA: <strong>Inställningar → Add-ons → HomeTwin Converter</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!haChecking && haAvailable && (
              <div className="flex items-center gap-2 text-[10px] text-green-400">
                <CheckCircle2 size={12} />
                HomeTwin Converter add-on är tillgänglig
              </div>
            )}

            {/* Large file warning when browser mode selected */}
            {convMode === 'browser' && fileMap && fileMap.totalSize > 150 * 1024 * 1024 && (
              <div className="flex items-start gap-2 text-[10px] text-yellow-400 p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>Modellen är {formatBytes(fileMap.totalSize)} — webbläsarkonvertering kan misslyckas. HA-konvertering rekommenderas.</span>
              </div>
            )}

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

            {/* Show selected mode */}
            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              {convMode === 'ha' ? <Server size={12} /> : <Monitor size={12} />}
              Konvertering: {convMode === 'ha' ? 'Home Assistant' : 'Webbläsare'}
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
              <div className="text-[10px] text-muted-foreground">
                {progress.percent}%
                {(progress.stage === 'uploading' || progress.stage === 'remote-converting' || progress.stage === 'downloading') && (
                  <span className="ml-2">🏠 via Home Assistant</span>
                )}
              </div>
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

/** Helper to count meshes/tris from a loaded scene (used after GLB download) */
function collectSceneStatsFromScene(scene: THREE.Object3D): { meshCount: number; triCount: number } {
  let meshCount = 0;
  let triCount = 0;
  scene.traverse((child) => {
    if ((child as any).isMesh) {
      meshCount++;
      const geo = (child as THREE.Mesh).geometry;
      if (geo) {
        if (geo.index) triCount += geo.index.count / 3;
        else if (geo.attributes?.position) triCount += geo.attributes.position.count / 3;
      }
    }
  });
  return { meshCount, triCount: Math.round(triCount) };
}
