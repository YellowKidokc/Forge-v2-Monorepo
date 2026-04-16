/**
 * GutterLayout — Three-column layout shell
 *
 * Left gutter (classification) | Prose area | Right gutter (annotations)
 *
 * Both gutters are independently collapsible with smooth animation.
 * Prose area has max-width to stay readable at any container width.
 */

import { type ReactNode } from 'react';
import type { GutterState } from '../../../lib/headerDrawer';
import type { UseHeaderDrawerReturn } from '../../../hooks/useHeaderDrawer';
import type { Annotation } from '../../../annotations/types';
import LeftGutter from './LeftGutter';
import RightGutter from './RightGutter';

interface GutterLayoutProps {
  drawerHook: UseHeaderDrawerReturn;
  annotations: Annotation[];
  activeLayers?: string[];
  onLayerToggle?: (layerId: string) => void;
  children: ReactNode;
}

export default function GutterLayout({
  drawerHook,
  annotations,
  activeLayers,
  onLayerToggle,
  children,
}: GutterLayoutProps) {
  const { gutterState, leftGutterWidth, rightGutterWidth, setLeftGutterWidth, setRightGutterWidth } = drawerHook;

  const showLeft = gutterState === 'full' || gutterState === 'left';
  const showRight = gutterState === 'full' || gutterState === 'right';

  return (
    <div className="gutter-layout flex flex-1 overflow-hidden">
      {/* Left Gutter */}
      <div
        className="gutter-left-container transition-all duration-150 ease-in-out overflow-hidden"
        style={{ width: showLeft ? `${leftGutterWidth}px` : '0px' }}
      >
        {showLeft && (
          <LeftGutter
            drawerHook={drawerHook}
            width={leftGutterWidth}
            onResize={setLeftGutterWidth}
          />
        )}
      </div>

      {/* Prose Area */}
      <div className="gutter-prose flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </div>

      {/* Right Gutter */}
      <div
        className="gutter-right-container transition-all duration-150 ease-in-out overflow-hidden"
        style={{ width: showRight ? `${rightGutterWidth}px` : '0px' }}
      >
        {showRight && (
          <RightGutter
            annotations={annotations}
            width={rightGutterWidth}
            onResize={setRightGutterWidth}
            activeLayers={activeLayers}
            onLayerToggle={onLayerToggle}
          />
        )}
      </div>
    </div>
  );
}
