import React, { useEffect, useMemo } from 'react';

const CLOSING_OPTIONS = [
    'Sincerely,',
    'Best regards,',
    'Kind regards,',
    'Respectfully,',
    'Thank you,',
    'Warm regards,',
];

const normalizeCoverLetter = (coverLetter) => ({
    hiringManagerName: coverLetter?.hiringManagerName || '',
    company: coverLetter?.company || '',
    location: coverLetter?.location || '',
    address: coverLetter?.address || '',
    greeting: coverLetter?.greeting || '',
    paragraphs: Array.isArray(coverLetter?.paragraphs) && coverLetter.paragraphs.length > 0 ? coverLetter.paragraphs : [''],
    closing: coverLetter?.closing || '',
});

const parseClosing = (closing, profileName) => {
    const raw = typeof closing === 'string' ? closing : '';
    const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    const first = lines[0] || '';
    const hasKnownSalutation = CLOSING_OPTIONS.some((opt) => opt.toLowerCase() === first.toLowerCase());
    const salutation = hasKnownSalutation ? first : 'Sincerely,';

    let name = '';
    if (lines.length >= 2 && hasKnownSalutation) {
        name = lines.slice(1).join(' ').trim();
    } else if (lines.length >= 2) {
        name = lines[lines.length - 1].trim();
    } else if (lines.length === 1 && !hasKnownSalutation) {
        name = lines[0].trim();
    }

    if (!name) name = (profileName || '').trim();
    return { salutation, name };
};

const formatClosing = (salutation, name) => {
    const s = (salutation || '').trim() || 'Sincerely,';
    const n = (name || '').trim();
    if (!n) return s;
    return `${s}\n${n}`;
};

function CoverLetterEditor({ coverLetter, onChange, profileName = '' }) {
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

    const { salutation, name } = useMemo(
        () => parseClosing(value.closing, profileName),
        [value.closing, profileName],
    );

    // Ensure we always have a name-filled closing after profile loads.
    useEffect(() => {
        const desired = formatClosing(salutation, name);
        if ((value.closing || '').trim() !== desired.trim()) {
            setField('closing', desired);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileName]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Recipient</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="label">
                        <span className="labelText">Hiring Manager Name</span>
                        <input
                            type="text"
                            value={value.hiringManagerName}
                            onChange={(e) => setField('hiringManagerName', e.target.value)}
                            className="input"
                            placeholder="Jane Smith"
                        />
                    </div>
                    <div className="label">
                        <span className="labelText">Company</span>
                        <input
                            type="text"
                            value={value.company}
                            onChange={(e) => setField('company', e.target.value)}
                            className="input"
                            placeholder="Acme Inc."
                        />
                    </div>
                    <div className="label" style={{ gridColumn: '1 / -1' }}>
                        <span className="labelText">Location</span>
                        <input
                            type="text"
                            value={value.location}
                            onChange={(e) => setField('location', e.target.value)}
                            className="input"
                            placeholder="Toronto, ON"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Greeting</label>
                <input
                    type="text"
                    value={value.greeting}
                    onChange={(e) => setField('greeting', e.target.value)}
                    className="input"
                    placeholder="Dear Hiring Manager,"
                />
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 600 }}>Body Paragraphs</label>
                    <button type="button" onClick={addParagraph} className="btn btn--add">
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
                                <button type="button" onClick={() => removeParagraph(idx)} className="btn btn--danger">
                                    Remove
                                </button>
                            </div>
                            <textarea
                                value={paragraph}
                                onChange={(e) => setParagraph(idx, e.target.value)}
                                rows={5}
                                className="textarea"
                                placeholder={idx === 0 ? 'First paragraph…' : `Paragraph ${idx + 1}…`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Closing</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="label">
                        <span className="labelText">Sign-off</span>
                        <select
                            className="select"
                            value={salutation}
                            onChange={(e) => setField('closing', formatClosing(e.target.value, name))}
                        >
                            {CLOSING_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="label">
                        <span className="labelText">Your Name</span>
                        <input
                            className="input"
                            type="text"
                            value={name}
                            onChange={(e) => setField('closing', formatClosing(salutation, e.target.value))}
                            placeholder="Your name"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CoverLetterEditor;
