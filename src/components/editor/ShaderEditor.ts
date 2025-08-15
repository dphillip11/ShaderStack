import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import type { CompilationError } from '../../types';
import { ShaderCompiler } from '../../utils/compiler';

export class ShaderEditor {
  private container: HTMLElement;
  private editor!: EditorView;
  private onChangeCallback?: (code: string) => void;
  private onCompileCallback?: (errors: CompilationError[]) => void;
  private compiler?: ShaderCompiler;

  constructor(container: HTMLElement, initialCode: string = '') {
    this.container = container;
    this.setupEditor(initialCode);
  }

  private setupEditor(initialCode: string) {
    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        basicSetup,
        javascript(), // Using JavaScript syntax for now, can be enhanced for WGSL
        oneDark,
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
    this.onCompileCallback?.(allErrors);
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

  // Highlight compilation errors in the editor (simplified implementation)
  highlightErrors(errors: CompilationError[]) {
    // For now, just log errors - proper error highlighting would require more complex CodeMirror setup
    if (errors.length > 0) {
      console.log('Shader compilation errors:', errors);
    }
  }

  private clearErrorHighlights() {
    // Placeholder for clearing error highlights
  }
}