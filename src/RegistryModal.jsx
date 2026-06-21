/*
 * Copyright 2026 Joao Vicente
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';

export default function RegistryModal({ isOpen, onClose, currentUrl, registries = [], onLoad, onLoadText }) {
    const [url, setUrl] = React.useState('');
    const [showOptions, setShowOptions] = React.useState(false);
    const [isSearching, setIsSearching] = React.useState(false);
    const dropdownRef = React.useRef(null);

    // Synchronize local state with currentUrl when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setUrl(currentUrl || '');
            setIsSearching(false);
            setShowOptions(false);
        }
    }, [isOpen, currentUrl]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleLoad = () => {
        onLoad(url);
        onClose();
    };

    const handleLoadFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                onLoadText(text);
                onClose();
            } else {
                alert("Clipboard is empty.");
            }
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            alert("Failed to read clipboard. Please make sure you have granted permission.");
        }
    };

    // registries is now expected to be [{ original: string, normalized: string }]
    const filteredOptions = isSearching && url
        ? (registries || []).filter(reg =>
            (reg.original || '').toLowerCase().includes(url.toLowerCase()) ||
            (reg.normalized || '').toLowerCase().includes(url.toLowerCase())
        )
        : (registries || []);

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Modal */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--m3-surface, white)',
                        borderRadius: '8px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '600px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                >
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--m3-on-surface, #1f2937)' }}>
                        Load Data Mesh Operational Data
                    </h2>

                    <div className="md-input-container" ref={dropdownRef}>
                        <input
                            type="text"
                            className="md-input-field"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setIsSearching(true);
                                setShowOptions(true);
                            }}
                            onFocus={() => {
                                setShowOptions(true);
                            }}
                            placeholder=" " /* Required for floating label */
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleLoad();
                                }
                                if (e.key === 'Escape') {
                                    setShowOptions(false);
                                }
                            }}
                        />
                        <label className="md-input-label">Operational Data URL</label>
                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    if (showOptions) {
                                        setShowOptions(false);
                                    } else {
                                        setIsSearching(false);
                                        setShowOptions(true);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    color: 'var(--m3-outline, #6b7280)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        

                        {showOptions && filteredOptions.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'var(--m3-surface, white)',
                                border: '1px solid var(--m3-outline, #d1d5db)',
                                borderRadius: '6px',
                                marginTop: '4px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                zIndex: 1010,
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {filteredOptions.map((reg, index) => (
                                    <div
                                        key={index}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setUrl(reg.original);
                                            setIsSearching(false);
                                            setShowOptions(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            borderBottom: index < (filteredOptions.length - 1) ? '1px solid var(--m3-surface-variant, #f3f4f6)' : 'none',
                                            background: url === reg.original ? 'var(--m3-surface-variant, #f3f4f6)' : 'var(--m3-surface, white)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--m3-surface-variant, #f3f4f6)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = url === reg.original ? 'var(--m3-surface-variant, #f3f4f6)' : 'var(--m3-surface, white)'}
                                    >
                                        <div style={{ fontWeight: '500', color: 'var(--m3-on-surface, #111111)' }}>{reg.original}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--m3-outline, #6b7280)', marginTop: '2px' }}>{reg.normalized}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleLoadFromClipboard}
                        >
                            Load from clipboard
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleLoad}
                        >
                            Load from URL
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
