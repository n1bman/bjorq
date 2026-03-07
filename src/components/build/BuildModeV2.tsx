import { lazy, Suspense } from 'react';
import { useAppStore } from '../../store/useAppStore';
import BuildTopToolbar from './BuildTopToolbar';
import BuildLeftPanel from './BuildLeftPanel';
import BuildInspector from './BuildInspector';
import BuildCanvas2D from './BuildCanvas2D';
import BuildScene3D from './BuildScene3D';
import BuildCatalogStrip from './BuildCatalogStrip';

const ImportPreview3D = lazy(() => import('./ImportPreview3D'));

export default function BuildModeV2() {
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);
  const isImported = useAppStore((s) => s.homeGeometry.source === 'imported');
  const hasImportedUrl = useAppStore((s) => !!s.homeGeometry.imported.url);

  const showImportOverlay = cameraMode === 'topdown' && isImported && hasImportedUrl;

  return (
    <div className="w-full h-full relative flex flex-col">
      <BuildTopToolbar />

      <div className="flex-1 relative flex overflow-hidden">
        <BuildLeftPanel />

        <div className="flex-1 relative">
          {cameraMode === 'topdown' ? (
            <>
              {showImportOverlay && (
                <Suspense fallback={null}>
                  <ImportPreview3D />
                </Suspense>
              )}
              <BuildCanvas2D overlayMode={showImportOverlay} />
            </>
          ) : (
            <BuildScene3D />
          )}

          <BuildInspector />
        </div>
      </div>

      <BuildCatalogStrip />
    </div>
  );
}
