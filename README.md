# Clarity-Hearing-system

OViz is a multi-tenant hearing-clinic platform for running structured consults, collecting patient intake responses, and helping clinic teams turn diagnostic inputs into clear, patient-facing outcome conversations.

## What The System Does

OViz supports the full clinic workflow around a consult:

- Clinic users sign in to a tenant-scoped workspace.
- New clinics are created through onboarding.
- Each user is linked to a clinic through a profile and role.
- Staff can start consults in different intake modes:
  - email intake
  - kiosk intake
  - in-clinic guided consult
- Patient responses are saved to the consult and combined with clinician-entered data.
- The system generates a structured report and presentation flow for the clinic to review with the patient.

## Core Areas

### Authentication And Access

OViz uses Supabase Auth for sign-in, sessions, and user identity. Users are connected to clinic workspaces through the `profiles` table, which stores clinic membership and role.

The application distinguishes between:

- clinic members working inside a single clinic workspace
- clinic-level admins who manage users, locations, and clinic settings
- a separate OViz Control Room for internal system administration

### Clinic Management

Each clinic has its own tenant record, subscription state, settings, and locations. Users belong to clinics through `profiles.clinic_id`, and application access is scoped by clinic so one clinic cannot access another clinic's data.

### Consult Workflow

Consults are the main working unit in the app. A consult can begin from:

- an emailed intake link
- a kiosk session in clinic
- a fully in-clinic workflow

The consult captures patient responses, clinician inputs, status, and generated outputs, all tied back to the clinic.

### Reporting And Presentation

OViz is designed to support educational, evidence-informed patient conversations. It helps clinicians translate hearing-related inputs into a structured report and a patient-friendly review experience.

### Internal Control Room

The OViz Control Room is a separate internal administrative surface for system-level operations. It is not the same as clinic admin. It exists for platform oversight across tenants, including clinic visibility, support workflows, and operational controls.

## System Architecture

OViz is a single Next.js application backed by Supabase.

- **Frontend:** Next.js App Router and React
- **Backend:** Next.js server routes and server components
- **Database/Auth:** Supabase
- **Styling/UI:** Tailwind CSS and component-based UI primitives

At a high level:

1. Supabase Auth identifies the user.
2. The user's profile links them to a clinic and role.
3. App routes and APIs load or mutate clinic-scoped data.
4. Consult, intake, reporting, and admin flows operate inside that tenant boundary.

## Intended Users

OViz is built for:

- hearing clinics
- clinic owners and clinic admins
- clinic staff running consults and intake flows
- internal OViz operators using the Control Room
