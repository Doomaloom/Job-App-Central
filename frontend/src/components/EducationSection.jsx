import React, { useState, useEffect } from 'react';

function EducationSection({ relevantCourses, onUpdateRelevantCourses }) {
    const [editing, setEditing] = useState(false);
    const [coursesText, setCoursesText] = useState('');

    useEffect(() => {
        setCoursesText(relevantCourses);
    }, [relevantCourses]);

    const handleSave = () => {
        onUpdateRelevantCourses(coursesText);
        setEditing(false);
    };

    const handleCancel = () => {
        setCoursesText(relevantCourses); // Revert to original
        setEditing(false);
    };

    return (
        <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white' }}>
            <h3>Education - Relevant Courses</h3>
            {editing ? (
                <div>
                    <textarea
                        value={coursesText}
                        onChange={(e) => setCoursesText(e.target.value)}
                        rows="3"
                        style={{ width: '100%', fontFamily: 'monospace' }}
                    ></textarea>
                    <div style={{ marginTop: '10px' }}>
                        <button type="button" onClick={handleSave} className="btn btn--add">Save</button>
                        <button type="button" onClick={handleCancel} className="btn" style={{ marginLeft: '10px' }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div>
                    <p>{relevantCourses}</p>
                    <button type="button" onClick={() => setEditing(true)} className="btn">Edit</button>
                </div>
            )}
        </div>
    );
}

export default EducationSection;
