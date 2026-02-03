-- ==============================================================================
-- TestFarm RLS (Row Level Security) Policies for Supabase
-- ==============================================================================
-- Run this in the Supabase SQL Editor after creating the tables with Drizzle migrations

-- Enable RLS on all tables with user_id
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables that inherit user context via FK
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Policies for tables with direct user_id
-- ==============================================================================

-- Personas: Users can only access their own personas
CREATE POLICY "Users can view own personas"
  ON public.personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personas"
  ON public.personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON public.personas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON public.personas FOR DELETE
  USING (auth.uid() = user_id);

-- Objectives: Users can only access their own objectives
CREATE POLICY "Users can view own objectives"
  ON public.objectives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own objectives"
  ON public.objectives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objectives"
  ON public.objectives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own objectives"
  ON public.objectives FOR DELETE
  USING (auth.uid() = user_id);

-- Projects: Users can only access their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Finding Groups: Users can only access their own finding groups
CREATE POLICY "Users can view own finding groups"
  ON public.finding_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own finding groups"
  ON public.finding_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finding groups"
  ON public.finding_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finding groups"
  ON public.finding_groups FOR DELETE
  USING (auth.uid() = user_id);

-- App Settings: Users can access their own settings or global defaults
CREATE POLICY "Users can view own settings or global"
  ON public.app_settings FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create own settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.app_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Policies for tables that inherit user context via FK
-- ==============================================================================

-- Session Chains: Access via project ownership or persona/objective ownership
CREATE POLICY "Users can view own session chains"
  ON public.session_chains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = session_chains.project_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = session_chains.persona_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create session chains with own resources"
  ON public.session_chains FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = session_chains.persona_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.objectives o
      WHERE o.id = session_chains.objective_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session chains"
  ON public.session_chains FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = session_chains.persona_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session chains"
  ON public.session_chains FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = session_chains.persona_id AND p.user_id = auth.uid()
    )
  );

-- Sessions: Access via project or persona ownership
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sessions.project_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = sessions.persona_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions with own resources"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = sessions.persona_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.objectives o
      WHERE o.id = sessions.objective_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = sessions.persona_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = sessions.persona_id AND p.user_id = auth.uid()
    )
  );

-- Events: Access via session ownership
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = events.session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events for own sessions"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = events.session_id AND p.user_id = auth.uid()
    )
  );

-- Findings: Access via session ownership
CREATE POLICY "Users can view own findings"
  ON public.findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = findings.session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create findings for own sessions"
  ON public.findings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = findings.session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own findings"
  ON public.findings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = findings.session_id AND p.user_id = auth.uid()
    )
  );

-- Session Reports: Access via session ownership
CREATE POLICY "Users can view own session reports"
  ON public.session_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = session_reports.session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports for own sessions"
  ON public.session_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.personas p ON p.id = s.persona_id
      WHERE s.id = session_reports.session_id AND p.user_id = auth.uid()
    )
  );

-- Integrations: Access via project ownership
CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = integrations.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create integrations for own projects"
  ON public.integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = integrations.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own integrations"
  ON public.integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = integrations.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own integrations"
  ON public.integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = integrations.project_id AND p.user_id = auth.uid()
    )
  );

-- Scheduled Tasks: Access via session chain ownership
CREATE POLICY "Users can view own scheduled tasks"
  ON public.scheduled_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_chains sc
      JOIN public.personas p ON p.id = sc.persona_id
      WHERE sc.id = scheduled_tasks.target_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scheduled tasks for own chains"
  ON public.scheduled_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_chains sc
      JOIN public.personas p ON p.id = sc.persona_id
      WHERE sc.id = scheduled_tasks.target_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scheduled tasks"
  ON public.scheduled_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_chains sc
      JOIN public.personas p ON p.id = sc.persona_id
      WHERE sc.id = scheduled_tasks.target_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scheduled tasks"
  ON public.scheduled_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_chains sc
      JOIN public.personas p ON p.id = sc.persona_id
      WHERE sc.id = scheduled_tasks.target_id AND p.user_id = auth.uid()
    )
  );
