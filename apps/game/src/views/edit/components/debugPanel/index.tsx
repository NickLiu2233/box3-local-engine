import React from 'react';
import { GameLogLevel } from '@box-local/schema/api/console';
import type { ParsedError } from '@box-local/schema/debugger-console/schema';
import { DebuggerClientStateSchema } from 'src/client/edit/debugger/debugger-client-state';
import { InputPauseConsumer } from '../../../components/input-lock';
import { editor } from 'src/client/edit/edit-client';

import style from './index.module.scss';
import { IntlShape, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { RootState } from 'src/redux/edit';
import { setIsShowDebugLogPanel, setNavMode } from 'src/redux/edit/creator';
import { LeftNavModeEnum } from '../../defs';
import type { CodeEditorProblem } from 'src/client/edit/code-editor/code-editor-client-controller';

type Props = {
  intl: IntlShape;
  float?: boolean;
  setIsShowDebugLogPanel: (isShow: boolean) => void;
  setNavMode: (mode: LeftNavModeEnum) => void;
};

type State = {
  expr: string;
  isInputPause: boolean;
  debuggerInfo: typeof DebuggerClientStateSchema.identity;
  activeTab: 'problems' | 'output';
  problems: CodeEditorProblem[];
  problemsReady: boolean;
};

class DebugContainer extends React.Component<Props, State> {
  private logListElm: HTMLElement | undefined;
  private shouldScrollToBottom = true;
  private inputListStep: number = 0;
  private markerDisposable?: { dispose: () => void };
  private markerConnectTimer?: ReturnType<typeof setTimeout>;
  private problemRefreshTimer?: ReturnType<typeof setTimeout>;
  private problemScanVersion = 0;
  private isUnmounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      expr: '',
      isInputPause: false,
      debuggerInfo: editor.state.debugger,
      activeTab: 'output',
      problems: [],
      problemsReady: false,
    };
  }

  public componentDidMount() {
    this.isUnmounted = false;
    if (this.logListElm && this.shouldScrollToBottom) {
      this.logListElm.scrollTop = this.logListElm.scrollHeight;
    }
    editor.listeners.debugger.sub(this._debuggerSub);
    this.connectProblemDiagnostics();
  }

  public componentDidUpdate() {
    if (this.logListElm && this.shouldScrollToBottom) {
      this.logListElm.scrollTop = this.logListElm.scrollHeight;
    }
  }
  public componentWillUnmount(): void {
    this.isUnmounted = true;
    this.problemScanVersion += 1;
    editor.listeners.debugger.unsub(this._debuggerSub);
    this.markerDisposable?.dispose();
    this.markerConnectTimer && clearTimeout(this.markerConnectTimer);
    this.problemRefreshTimer && clearTimeout(this.problemRefreshTimer);
  }

  private connectProblemDiagnostics = () => {
    if (this.props.float || this.markerDisposable) {
      return;
    }

    const monacoController = editor.codeEditorController.monacoController;
    if (!monacoController.isReady) {
      this.markerConnectTimer = setTimeout(this.connectProblemDiagnostics, 100);
      return;
    }

    this.markerDisposable = monacoController.monaco.editor.onDidChangeMarkers(
      this.scheduleProblemRefresh,
    );
    void this.refreshProblems();
  };

  private scheduleProblemRefresh = () => {
    this.problemRefreshTimer && clearTimeout(this.problemRefreshTimer);
    this.problemRefreshTimer = setTimeout(() => {
      void this.refreshProblems();
    }, 120);
  };

  private refreshProblems = async () => {
    const scanVersion = ++this.problemScanVersion;
    try {
      const problems = await editor.codeEditorController.getProblems();
      if (this.isUnmounted || scanVersion !== this.problemScanVersion) {
        return;
      }
      this.setState({ problems, problemsReady: true });
    } catch {
      if (this.isUnmounted || scanVersion !== this.problemScanVersion) {
        return;
      }
      // The editor may be closing while Monaco tears down its worker. Keep the
      // previous stable list instead of replacing it with a false empty state.
      this.setState({ problemsReady: true });
    }
  };

  private _debuggerSub = (data) => {
    this.setState({ debuggerInfo: DebuggerClientStateSchema.clone(data) });
  };

  private _handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (this.logListElm) {
      if (
        this.logListElm.scrollTop + this.logListElm.offsetHeight >=
        this.logListElm.scrollHeight
      ) {
        this.shouldScrollToBottom = true;
      } else {
        this.shouldScrollToBottom = false;
      }
    }
  };

  private setExpr = (v: string) => {
    this.setState({
      expr: v,
    });
  };

  private handleKeydown = (e: React.KeyboardEvent) => {
    const debugInputList = this.state.debuggerInfo.debugInput;
    if (e.keyCode === 13) {
      editor.scriptEval(this.state.expr);
      this.setExpr('');
      this.inputListStep = 0;
    } else if (e.keyCode === 38) {
      // up
      e.preventDefault();
      if (this.inputListStep > debugInputList.length - 1) {
        return;
      }
      this.inputListStep++;
      const input = debugInputList[debugInputList.length - this.inputListStep];
      if (input !== undefined && input.length) {
        this.setExpr(input);
      }
    } else if (e.keyCode === 40) {
      // down
      e.preventDefault();
      if (this.inputListStep <= 1) {
        return;
      }
      this.inputListStep--;
      const input = debugInputList[debugInputList.length - this.inputListStep];
      if (input !== undefined && input.length) {
        this.setExpr(input);
      }
    }
  };

  public renderLogList() {
    return (
      <div
        className={style.logWrapper}
        onScroll={this._handleListScroll}
        ref={(ref) => {
          if (ref) {
            this.logListElm = ref;
          }
        }}
      >
        <div className={style.logContainer}>
          {this.state.debuggerInfo.log.map((log) => {
            let className = style.log;
            if (log.level === GameLogLevel.ERROR) {
              className = style.logError;
            } else if (log.level === GameLogLevel.WARN) {
              className = style.logWarning;
            }

            const data = log.message.data;
            if (log.message.type === 'exception') {
              const error = data as ParsedError;
              return (
                <div key={log.id} className={className}>
                  {error.name}: {error.message}
                  <br />
                  {error.stack.map((frame, i) => {
                    return (
                      <div key={log.id + '.' + i}>
                        &nbsp; at {frame.function}
                        &nbsp; (
                        <a
                          className={style.exceptionLink}
                          onClick={() => {
                            this.props.setNavMode(LeftNavModeEnum.Script);
                            editor.codeEditorController.gotoFileWithPos(
                              frame.file,
                              frame.line,
                              frame.column,
                            );
                          }}
                        >
                          {frame.file}:{frame.line}:{frame.column}
                        </a>
                        )
                      </div>
                    );
                  })}
                </div>
              );
            } else if (log.message.type === 'text') {
              const lines = (data as string).split('\n');
              return (
                <div key={log.id} className={className}>
                  {lines.map((line, index) => {
                    return (
                      line && (
                        <span key={index}>
                          {line}
                          <br />
                        </span>
                      )
                    );
                  })}
                </div>
              );
            } else if (log.message.type === 'evalExpression') {
              const lines = (data as string).split('\n');
              return (
                <div key={log.id} className={className}>
                  <i>~&gt;</i> {lines[0]} {lines.slice(1).map((line) => line)}
                </div>
              );
            } else if (log.message.type === 'evalResult') {
              return (
                <div key={log.id} className={className}>
                  <i>&lt;~</i> {data}
                </div>
              );
            } else {
              // unhandled log type
              return null;
            }
          })}
        </div>
      </div>
    );
  }

  public renderDebugInput() {
    return (
      <div className={style.scriptEval}>
        {this.state.isInputPause && <InputPauseConsumer />}
        <div className={style.scriptEvalIcon}></div>
        <input
          autoFocus
          className={style.scriptEvalInput}
          type="text"
          onChange={(e) => this.setExpr(e.target.value)}
          onKeyDown={this.handleKeydown}
          value={this.state.expr}
          onFocus={() => this.setState({ isInputPause: true })}
          onBlur={() => this.setState({ isInputPause: false })}
          placeholder={this.props.intl.formatMessage({ id: 'console' })}
        ></input>
      </div>
    );
  }

  public renderProblemList() {
    const { problems, problemsReady } = this.state;
    if (!problemsReady) {
      return (
        <div className={style.problemEmpty}>
          {this.props.intl.formatMessage({ id: 'checkingProblems' })}
        </div>
      );
    }
    if (problems.length === 0) {
      return (
        <div className={style.problemEmpty}>
          {this.props.intl.formatMessage({ id: 'noProblems' })}
        </div>
      );
    }

    const errorSeverity =
      editor.codeEditorController.monacoController.monaco.MarkerSeverity.Error;
    return (
      <div className={style.problemList}>
        {problems.map((problem) => {
          const isError = problem.severity === errorSeverity;
          const key = `${problem.fileId}:${problem.startLineNumber}:${problem.startColumn}:${problem.code || ''}:${problem.message}`;
          return (
            <button
              type="button"
              key={key}
              className={style.problemItem}
              onClick={() => {
                this.props.setNavMode(LeftNavModeEnum.Script);
                editor.codeEditorController.gotoFileWithPos(
                  problem.fileName,
                  problem.startLineNumber,
                  problem.startColumn,
                );
              }}
            >
              <span
                className={isError ? style.problemError : style.problemWarning}
                aria-hidden="true"
              >
                {isError ? '×' : '!'}
              </span>
              <span className={style.problemContent}>
                <span className={style.problemMessage}>{problem.message}</span>
                <span className={style.problemLocation}>
                  {problem.fileName}:{problem.startLineNumber}:
                  {problem.startColumn}
                  {problem.code ? ` · ${problem.code}` : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  public render() {
    return (
      <div
        className={this.props.float ? style.floatContainer : style.container}
      >
        {!this.props.float && (
          <div className={style.consoleTitleContainer}>
            <div className={style.consoleTabs}>
              <button
                type="button"
                className={
                  this.state.activeTab === 'problems'
                    ? style.consoleTabActive
                    : style.consoleTab
                }
                onClick={() => this.setState({ activeTab: 'problems' })}
              >
                {this.props.intl.formatMessage({ id: 'problems' })}
                {this.state.problems.length > 0 && (
                  <span className={style.problemCount}>
                    {this.state.problems.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={
                  this.state.activeTab === 'output'
                    ? style.consoleTabActive
                    : style.consoleTab
                }
                onClick={() => this.setState({ activeTab: 'output' })}
              >
                {this.props.intl.formatMessage({ id: 'output' })}
              </button>
            </div>
            <div
              className={style.closeBtn}
              onClick={() => this.props.setIsShowDebugLogPanel(false)}
            ></div>
          </div>
        )}
        {this.props.float || this.state.activeTab === 'output' ? (
          <>
            {this.renderLogList()}
            {this.renderDebugInput()}
          </>
        ) : (
          this.renderProblemList()
        )}
      </div>
    );
  }
}

export const DebugPanel = connect((state: RootState) => ({}), {
  setIsShowDebugLogPanel,
  setNavMode,
})(injectIntl(DebugContainer));
