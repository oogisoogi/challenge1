import { Hono } from "hono";
import { errorBoundary } from "@/backend/middleware/error";
import { withAppContext } from "@/backend/middleware/context";
import { withSupabase } from "@/backend/middleware/supabase";
import { registerExampleRoutes } from "@/features/example/backend/route";
import { registerAuthRoutes } from "@/features/auth/backend/route";
import { registerCourseRoutes } from "@/features/course/backend/route";
import { registerLearnerDashboardRoutes } from "@/features/learner-dashboard/backend/route";
import { registerInstructorDashboardRoutes } from "@/features/instructor-dashboard/backend/route";
import { registerAssignmentDetailRoutes } from "@/features/assignment-detail/backend/route";
import { registerGradesRoutes } from "@/features/grades/backend/route";
import type { AppEnv } from "@/backend/hono/context";

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  if (singletonApp && process.env.NODE_ENV === "production") {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use("*", errorBoundary());
  app.use("*", withAppContext());
  app.use("*", withSupabase());

  registerAuthRoutes(app);
  registerCourseRoutes(app);
  registerLearnerDashboardRoutes(app);
  registerInstructorDashboardRoutes(app);
  registerAssignmentDetailRoutes(app);
  registerGradesRoutes(app);
  registerExampleRoutes(app);

  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Route not found: ${c.req.method} ${c.req.path}`,
        },
      },
      404
    );
  });

  if (process.env.NODE_ENV === "production") {
    singletonApp = app;
  }

  return app;
};
