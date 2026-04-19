import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    margin: '20px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '12px',
                    color: '#991b1b',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Something went wrong</h2>
                    <p style={{ margin: '0 0 12px 0' }}>The application encountered an error while rendering this component.</p>
                    <div style={{
                        padding: '12px',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        maxHeight: '200px'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '20px',
                            padding: '8px 16px',
                            background: '#991b1b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
