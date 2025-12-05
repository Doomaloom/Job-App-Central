import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import JobDetailsForm from './components/JobDetailsForm';
import ResumeEditor from './components/ResumeEditor'; // Import the new component

const defaultResume = () => ({
  objective: '',
  relevantCourses: '',
  jobs: [],
  projects: [],
  skillCategories: [],
});

// Placeholder Component for Cover Letter Tab
const CoverLetterTab = ({ application }) => <div>Cover Letter for Application: {application ? application.jobTitle : ''}</div>;

// Profile card shown at the top of the sidebar
const ProfileCard = ({ profile, onEdit }) => {
  const initials = profile.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0].toUpperCase())
        .slice(0, 2)
        .join('')
    : 'U';

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{profile.name}</div>
          <div style={{ fontSize: '0.9em', color: '#555' }}>{profile.role}</div>
          <div style={{ fontSize: '0.85em', color: '#777' }}>{profile.email}</div>
        </div>
      </div>
      <button
        onClick={onEdit}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '8px',
          backgroundColor: '#0056b3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        View & Edit Profile
      </button>
    </div>
  );
};

// Profile page where the user can view and edit their info
const ProfilePage = ({ profile, onUpdate }) => {
  const [localProfile, setLocalProfile] = useState(profile);
  const isFirstRender = useRef(true);
  const saveTimeout = useRef(null);

  useEffect(() => {
    setLocalProfile({
      ...profile,
      resume: profile.resume || defaultResume(),
    });
  }, [profile]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      onUpdate(localProfile);
    }, 500);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [localProfile, onUpdate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleResumeChange = (newResume) => {
    setLocalProfile((prev) => ({ ...prev, resume: newResume }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(localProfile);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Your Profile</h2>
      <p style={{ color: '#555', marginBottom: '20px' }}>Update your contact information and role so applications stay organized. Changes autosave.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>Full Name</span>
          <input
            type="text"
            name="name"
            value={localProfile.name}
            onChange={handleChange}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>Role / Title</span>
          <input
            type="text"
            name="role"
            value={localProfile.role}
            onChange={handleChange}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>Email</span>
          <input
            type="email"
            name="email"
            value={localProfile.email}
            onChange={handleChange}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>Location</span>
          <input
            type="text"
            name="location"
            value={localProfile.location}
            onChange={handleChange}
            placeholder="City, Country"
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>About You</span>
          <textarea
            name="bio"
            value={localProfile.bio}
            onChange={handleChange}
            rows="4"
            placeholder="Short summary about your experience or goals."
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: '12px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Save Profile
        </button>
      </form>
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '12px' }}>Default Resume</h3>
        <p style={{ color: '#555', marginBottom: '16px' }}>Edit the resume content that will appear by default. You can still customize each application later.</p>
        <div style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '16px', backgroundColor: '#fafafa' }}>
          <ResumeEditor
            application={{ resume: localProfile.resume || defaultResume() }}
            onResumeChange={handleResumeChange}
            initKey="profile"
          />
        </div>
      </div>
    </div>
  );
};

// Component for Job Details Tab - now uses JobDetailsForm
const JobDetailsTab = ({ application, onSave }) => {
  if (!application) {
    return <div>Loading job details...</div>;
  }
  return <JobDetailsForm application={application} onSave={onSave} />;
};

// Main Application Component
function App() {
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'resume', 'coverletter'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('jobapp_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read profile from localStorage', e);
    }
    return {
      name: 'Your Name',
      role: 'Applicant',
      email: 'you@example.com',
      location: '',
      bio: '',
      resume: defaultResume(),
    };
  });
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem('jobapp_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save profile', e);
    }
  }, [profile]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setApplications(data);
    } catch (e) {
      setError(e);
      console.error("Failed to fetch applications:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async () => {
    const newApp = {
      jobTitle: "New Job Application",
      company: "New Company",
      applicationStatus: "applied",
      jobDescription: "",
      // Start with an empty resume; user can selectively import from profile
      resume: defaultResume(),
    };
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newApp),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const createdApp = await response.json();
      fetchApplications(); // Refresh the list
      navigate(`/application/${createdApp.id}`);
    } catch (e) {
      console.error("Failed to create application:", e);
      alert("Failed to create new application.");
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile({
      ...updatedProfile,
      resume: updatedProfile.resume || defaultResume(),
    });
  };

  const handleDeleteApplication = async (appId) => {
    const confirmed = window.confirm('Are you sure you want to delete this application? This cannot be undone.');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setApplications((prev) => prev.filter((app) => app.id !== appId));
      // If currently viewing the deleted app, navigate home
      const currentId = window.location.pathname.split('/').pop();
      if (currentId === appId) {
        navigate('/');
      }
    } catch (e) {
      console.error("Failed to delete application:", e);
      alert('Failed to delete application.');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading applications...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Error: {error.message}</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f0f0f0', padding: '20px', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
        <ProfileCard profile={profile} onEdit={() => navigate('/profile')} />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Job Applications</h2>
          <button onClick={handleCreateApplication} style={{padding: '5px 10px'}}>+</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {applications.map((app) => (
            <li key={app.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <Link to={`/application/${app.id}`} style={{ textDecoration: 'none', color: '#333', flexGrow: 1 }}>
                  <div style={{ padding: '10px', backgroundColor: '#e0e0e0', borderRadius: '5px' }}>
                    <strong>{app.jobTitle}</strong>
                    <p style={{ margin: 0, fontSize: '0.9em' }}>{app.company}</p>
                    <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Status: {app.applicationStatus}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDeleteApplication(app.id)}
                  style={{
                    minWidth: '32px',
                    border: '1px solid #c00',
                    background: '#fff0f0',
                    color: '#c00',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                  aria-label={`Delete ${app.jobTitle}`}
                  title="Delete application"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flexGrow: 1, padding: '20px' }}>
        <Routes>
          <Route path="/" element={<h2>Welcome! Select an application from the sidebar or create a new one.</h2>} />
          <Route 
            path="/application/:id" 
            element={
              <ApplicationDetail 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onApplicationUpdate={fetchApplications} // Pass refresh function to update sidebar
                profileResume={profile.resume || defaultResume()}
              />
            } 
          />
          <Route
            path="/profile"
            element={<ProfilePage profile={profile} onUpdate={handleProfileUpdate} />}
          />
        </Routes>
      </div>
    </div>
  );
}

// Component to display specific application details with tabs
function ApplicationDetail({ activeTab, setActiveTab, onApplicationUpdate, profileResume }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplicationDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/applications/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApplication(data);
      } catch (e) {
        setError(e);
        console.error("Failed to fetch application detail:", e);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchApplicationDetail();
    }
  }, [id]); // Re-fetch when ID changes

  const handleSaveApplication = async (updatedApp) => {
    try {
      const response = await fetch(`/api/applications/${updatedApp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedApp),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const savedApp = await response.json();
      setApplication(savedApp); // Update local state with saved data
      onApplicationUpdate(); // Refresh sidebar list
      alert('Application saved successfully!');
    } catch (e) {
      setError(e);
      console.error("Failed to save application:", e);
      alert('Failed to save application.');
    }
  };

  const handleGeneratePdf = async () => {
    if (!application) return;

    try {
      // Create a copy of the application and remove temporary IDs
      const appForPdf = JSON.parse(JSON.stringify(application)); // Deep copy
      
      if (appForPdf.resume) {
        if (appForPdf.resume.jobs) {
          appForPdf.resume.jobs = appForPdf.resume.jobs.map(job => {
            const { id, ...rest } = job;
            return rest;
          });
        }
        if (appForPdf.resume.projects) {
          appForPdf.resume.projects = appForPdf.resume.projects.map(proj => {
            const { id, ...rest } = proj;
            return rest;
          });
        }
        if (appForPdf.resume.skillCategories) {
          appForPdf.resume.skillCategories = appForPdf.resume.skillCategories.map(cat => {
            const { id, ...rest } = cat;
            return rest;
          });
        }
      }

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appForPdf),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${application.company}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert('PDF generated and downloaded!');

    } catch (e) {
      console.error("Failed to generate PDF:", e);
      alert('Failed to generate PDF: ' + e.message);
    }
  };


  const handleResumeChange = (newResumeData) => {
    setApplication(prevApp => ({...prevApp, resume: newResumeData}))
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading application details...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Error loading application: {error.message}</div>;
  if (!application) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Application not found.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>{application.jobTitle} at {application.company}</h1>
        <button 
          onClick={handleGeneratePdf} 
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Generate PDF
        </button>
      </div>
      
      {/* Tabs Navigation */}
      <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('details')} 
          style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'details' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
        >
          Job Details
        </button>
        <button 
          onClick={() => setActiveTab('resume')} 
          style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'resume' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
        >
          Resume Editor
        </button>
        <button 
          onClick={() => setActiveTab('coverletter')} 
          style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'coverletter' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
        >
          Cover Letter
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && <JobDetailsTab application={application} onSave={handleSaveApplication} />}
        {activeTab === 'resume' && (
          <ResumeEditor
            application={application}
            onResumeChange={handleResumeChange}
            baseResume={profileResume}
          />
        )}
        {activeTab === 'coverletter' && <CoverLetterTab application={application} />}
      </div>
    </div>
  );
}

export default App;
