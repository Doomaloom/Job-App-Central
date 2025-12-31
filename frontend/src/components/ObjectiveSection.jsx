import React, { useState, useEffect } from 'react';

function ObjectiveSection({ objective, onUpdateObjective, baseObjective }) {
    const [editing, setEditing] = useState(false);
    const [objectiveText, setObjectiveText] = useState('');

    useEffect(() => {
        setObjectiveText(objective);
    }, [objective]);

    const handleSave = () => {
        onUpdateObjective(objectiveText);
        setEditing(false);
    };

    const handleCancel = () => {
        setObjectiveText(objective); // Revert to original
        setEditing(false);
    };

    return (
        <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white' }}>
            <h3>Candidate Summary</h3>
            {baseObjective && (
                <div style={{ marginBottom: '8px' }}>
                    <button
                        type="button"
                        onClick={() => onUpdateObjective(baseObjective)}
                        disabled={objective === baseObjective}
                        className="btn btn--sm"
                    >
                        {objective === baseObjective ? 'Using Profile Objective' : 'Use Profile Objective'}
                    </button>
                </div>
            )}
            {editing ? (
                <div>
                    <textarea
                        value={objectiveText}
                        onChange={(e) => setObjectiveText(e.target.value)}
                        rows="5"
                        style={{ width: '100%', fontFamily: 'monospace' }}
                    ></textarea>
                    <div style={{ marginTop: '10px' }}>
                        <button type="button" onClick={handleSave} className="btn btn--add">Save</button>
                        <button type="button" onClick={handleCancel} className="btn" style={{ marginLeft: '10px' }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div>
                    <p>{objective}</p>
                    <button type="button" onClick={() => setEditing(true)} className="btn">Edit</button>
                </div>
            )}
        </div>
    );
}

export default ObjectiveSection;
