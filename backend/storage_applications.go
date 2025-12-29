package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

var errNotFound = errors.New("not found")

func (s *dbStore) ListApplicationSummaries(ctx context.Context, userID string) ([]ApplicationSummary, error) {
	rows, err := s.pool.Query(ctx, `
		select id::text, job_title, company, application_status
		from applications
		where user_id = $1::uuid
		order by updated_at desc
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ApplicationSummary
	for rows.Next() {
		var a ApplicationSummary
		if err := rows.Scan(&a.ID, &a.JobTitle, &a.Company, &a.ApplicationStatus); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if out == nil {
		out = []ApplicationSummary{}
	}
	return out, nil
}

func (s *dbStore) CreateApplication(ctx context.Context, userID string, app Application) (Application, error) {
	id := uuid.New()
	app.ID = id.String()

	resumeBytes, err := json.Marshal(app.Resume)
	if err != nil {
		return Application{}, err
	}
	var coverBytes []byte
	if app.CoverLetter != nil {
		coverBytes, err = json.Marshal(app.CoverLetter)
		if err != nil {
			return Application{}, err
		}
	}

	_, err = s.pool.Exec(ctx, `
		insert into applications (id, user_id, job_title, company, application_status, job_description, resume, cover_letter, created_at, updated_at)
		values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8::jsonb, now(), now())
	`,
		id, userID, app.JobTitle, app.Company, app.ApplicationStatus, app.JobDescription, string(resumeBytes), nullableJSONB(coverBytes),
	)
	if err != nil {
		return Application{}, err
	}

	return app, nil
}

func (s *dbStore) GetApplication(ctx context.Context, userID, id string) (Application, error) {
	var app Application
	app.ID = id

	var resumeRaw []byte
	var coverRaw []byte
	var coverIsNull bool
	err := s.pool.QueryRow(ctx, `
		select job_title, company, application_status, job_description, resume, cover_letter
		from applications
		where user_id = $1::uuid and id = $2::uuid
	`, userID, id).Scan(&app.JobTitle, &app.Company, &app.ApplicationStatus, &app.JobDescription, &resumeRaw, &coverRaw)
	if err != nil {
		return Application{}, err
	}

	if err := json.Unmarshal(resumeRaw, &app.Resume); err != nil {
		return Application{}, err
	}

	// coverRaw will be nil if NULL; Scan into []byte yields nil.
	coverIsNull = len(coverRaw) == 0
	if !coverIsNull {
		var cl CoverLetter
		if err := json.Unmarshal(coverRaw, &cl); err != nil {
			return Application{}, err
		}
		app.CoverLetter = &cl
	}

	return app, nil
}

func (s *dbStore) UpdateApplication(ctx context.Context, userID string, app Application) (Application, error) {
	if strings.TrimSpace(app.ID) == "" {
		return Application{}, fmt.Errorf("id required")
	}

	resumeBytes, err := json.Marshal(app.Resume)
	if err != nil {
		return Application{}, err
	}
	var coverBytes []byte
	if app.CoverLetter != nil {
		coverBytes, err = json.Marshal(app.CoverLetter)
		if err != nil {
			return Application{}, err
		}
	}

	ct, err := s.pool.Exec(ctx, `
		update applications
		set job_title = $3,
		    company = $4,
		    application_status = $5,
		    job_description = $6,
		    resume = $7::jsonb,
		    cover_letter = $8::jsonb,
		    updated_at = now()
		where user_id = $1::uuid and id = $2::uuid
	`, userID, app.ID, app.JobTitle, app.Company, app.ApplicationStatus, app.JobDescription, string(resumeBytes), nullableJSONB(coverBytes))
	if err != nil {
		return Application{}, err
	}
	if ct.RowsAffected() == 0 {
		return Application{}, errNotFound
	}

	return app, nil
}

func (s *dbStore) DeleteApplication(ctx context.Context, userID, id string) error {
	ct, err := s.pool.Exec(ctx, `delete from applications where user_id = $1::uuid and id = $2::uuid`, userID, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

func nullableJSONB(raw []byte) any {
	if len(raw) == 0 {
		return nil
	}
	return string(raw)
}
