import React from 'react';

const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
const textareaStyle = { ...inputStyle, resize: 'vertical' };
const buttonStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' };

const normalizeCoverLetter = (coverLetter) => ({
    address: coverLetter?.address || '',
    greeting: coverLetter?.greeting || '',
    paragraphs: Array.isArray(coverLetter?.paragraphs) && coverLetter.paragraphs.length > 0 ? coverLetter.paragraphs : [''],
    closing: coverLetter?.closing || '',
});

function CoverLetterEditor({ coverLetter, onChange }) {
    const value = normalizeCoverLetter(coverLetter);

    const setField = (field, nextValue) => {
        onChange({ ...value, [field]: nextValue });
    };

    const setParagraph = (index, nextText) => {
        const next = value.paragraphs.slice();
        next[index] = nextText;
        setField('paragraphs', next);
    };

    const addParagraph = () => {
        setField('paragraphs', [...value.paragraphs, '']);
    };

    const removeParagraph = (index) => {
        const next = value.paragraphs.filter((_, i) => i !== index);
        setField('paragraphs', next.length > 0 ? next : ['']);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Address</label>
                <textarea
                    value={value.address}
                    onChange={(e) => setField('address', e.target.value)}
                    rows={4}
                    style={textareaStyle}
                    placeholder={'Your Name\nStreet Address\nCity, State ZIP\nPhone | Email'}
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Greeting</label>
                <input
                    type="text"
                    value={value.greeting}
                    onChange={(e) => setField('greeting', e.target.value)}
                    style={inputStyle}
                    placeholder="Dear Hiring Manager,"
                />
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 600 }}>Body Paragraphs</label>
                    <button type="button" onClick={addParagraph} style={buttonStyle}>
                        Add Paragraph
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {value.paragraphs.map((paragraph, idx) => (
                        <div key={`para-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.95em', color: '#555' }}>
                                    {idx === 0 ? 'First paragraph' : `Paragraph ${idx + 1}`}
                                </div>
                                <button type="button" onClick={() => removeParagraph(idx)} style={buttonStyle}>
                                    Remove
                                </button>
                            </div>
                            <textarea
                                value={paragraph}
                                onChange={(e) => setParagraph(idx, e.target.value)}
                                rows={5}
                                style={textareaStyle}
                                placeholder={idx === 0 ? 'First paragraph…' : `Paragraph ${idx + 1}…`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Closing</label>
                <textarea
                    value={value.closing}
                    onChange={(e) => setField('closing', e.target.value)}
                    rows={3}
                    style={textareaStyle}
                    placeholder={'Sincerely,\nYour Name'}
                />
            </div>
        </div>
    );
}

export default CoverLetterEditor;
