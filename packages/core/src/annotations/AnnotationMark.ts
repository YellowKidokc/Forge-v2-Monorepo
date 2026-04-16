import { Mark, mergeAttributes } from '@tiptap/core';

export interface AnnotationMarkOptions {
  HTMLAttributes: Record<string, unknown>;
  onAnnotationClick?: (annotationId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationMark: {
      setAnnotation: (attrs: { annotationId: string; layerId: string; markerStyle: string }) => ReturnType;
      unsetAnnotation: () => ReturnType;
    };
  }
}

export const AnnotationMark = Mark.create<AnnotationMarkOptions>({
  name: 'annotationMark',

  addOptions() {
    return {
      HTMLAttributes: {},
      onAnnotationClick: undefined,
    };
  },

  addAttributes() {
    return {
      annotationId: { default: null, parseHTML: el => el.getAttribute('data-annotation-id') },
      layerId: { default: 'commentary', parseHTML: el => el.getAttribute('data-layer-id') },
      markerStyle: { default: 'chevron', parseHTML: el => el.getAttribute('data-marker-style') },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-annotation-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, {
      'data-annotation-id': HTMLAttributes.annotationId,
      'data-layer-id': HTMLAttributes.layerId,
      'data-marker-style': HTMLAttributes.markerStyle,
      class: `forge-annotation forge-marker-${HTMLAttributes.markerStyle}`,
      role: 'button',
      tabindex: '0',
      'aria-label': 'Expand annotation',
    }), 0];
  },

  addCommands() {
    return {
      setAnnotation: (attrs) => ({ commands }) => {
        return commands.setMark(this.name, attrs);
      },
      unsetAnnotation: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-n': () => {
        // Trigger annotation creation flow
        // The actual UI handling happens in the React layer
        return true;
      },
    };
  },
});
