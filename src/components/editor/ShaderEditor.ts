import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter } from '@codemirror/lint';
import type { CompilationError } from '../../types';
import { ShaderCompiler } from '../../utils/compiler';

export class ShaderEditor {
  private container: HTMLElement;
  private editor!: EditorView;
  private onChangeCallback?: (code: string) => void;
  private onCompileCallback?: (errors: CompilationError[]) => void;
  private compiler?: ShaderCompiler;
  private currentErrors: CompilationError[] = [];

  constructor(container: HTMLElement, initialCode: string = '') {
    this.container = container;
    this.setupEditor(initialCode);
  }

  private setupEditor(initialCode: string) {
    const wgslLinter = linter((view) => {
      const diagnostics = [];
      
      for (const error of this.currentErrors) {
        const line = Math.max(0, error.line - 1);
        const doc = view.state.doc;
        
        if (line < doc.lines) {
          const lineObj = doc.line(line + 1);
          const from = lineObj.from + Math.max(0, error.column - 1);
          const to = Math.min(lineObj.to, from + 10); // Highlight ~10 chars or to end of line
          
          diagnostics.push({
            from,
            to,
            severity: error.type as 'error' | 'warning',
            message: error.message,
          });
        }
      }
      
      return diagnostics;
    });

    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        basicSetup,
        javascript(), // Using JavaScript syntax for now, can be enhanced for WGSL
        oneDark,
        lintGutter(), // Show lint gutter with error indicators
        wgslLinter,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const code = update.state.doc.toString();
            this.onChangeCallback?.(code);
            this.validateCode(code);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-content': {
            padding: '12px',
            minHeight: '100%',
          },
          '.cm-editor': {
            height: '100%',
          },
          '.cm-scroller': {
            height: '100%',
          },
          '.cm-diagnostic': {
            padding: '3px 6px 3px 8px',
            marginLeft: '-1px',
            display: 'block',
            whiteSpace: 'pre-wrap',
          },
          '.cm-diagnostic-error': {
            borderLeft: '5px solid #d32f2f',
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
          },
          '.cm-diagnostic-warning': {
            borderLeft: '5px solid #f57c00',
            backgroundColor: 'rgba(245, 124, 0, 0.1)',
          },
          '.cm-lintRange-error': {
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #d32f2f 2px, #d32f2f 4px)',
            backgroundPosition: 'bottom',
            backgroundSize: '100% 2px',
            backgroundRepeat: 'repeat-x',
          },
          '.cm-lintRange-warning': {
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #f57c00 2px, #f57c00 4px)',
            backgroundPosition: 'bottom',
            backgroundSize: '100% 2px',
            backgroundRepeat: 'repeat-x',
          },
        }),
      ],
    });

    this.editor = new EditorView({
      state,
      parent: this.container,
    });
  }

  private async validateCode(code: string) {
    // Basic WGSL validation
    const staticErrors = ShaderCompiler.validateWGSL(code);
    
    // Runtime compilation validation if compiler is available
    let compilationErrors: CompilationError[] = [];
    if (this.compiler) {
      const result = await this.compiler.compileShader(code, 'fragment');
      compilationErrors = result.errors;
    }

    const allErrors = [...staticErrors, ...compilationErrors];
    this.updateErrors(allErrors);
    this.onCompileCallback?.(allErrors);
  }

  private updateErrors(errors: CompilationError[]) {
    this.currentErrors = errors;
    // Force lint update
    this.editor.dispatch({});
  }

  setCompiler(compiler: ShaderCompiler) {
    this.compiler = compiler;
  }

  onChange(callback: (code: string) => void) {
    this.onChangeCallback = callback;
  }

  onCompile(callback: (errors: CompilationError[]) => void) {
    this.onCompileCallback = callback;
  }

  setValue(code: string) {
    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: code,
      },
    });
  }

  getValue(): string {
    return this.editor.state.doc.toString();
  }

  focus() {
    this.editor.focus();
  }

  destroy() {
    this.editor.destroy();
  }

  highlightErrors(errors: CompilationError[]) {
    this.updateErrors(errors);
  }
}