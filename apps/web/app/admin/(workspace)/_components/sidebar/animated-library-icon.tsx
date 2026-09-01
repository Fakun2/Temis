"use client";

import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export const AnimatedLibraryIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.75, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="-1.75 -1.75 27.5 27.5"
      className={cn("justinia-library-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-library-icon-folder">
        <path
          className="justinia-library-icon-top"
          d="M10 3H16.5C16.9644 3 17.1966 3 17.3916 3.02567C18.7378 3.2029 19.7971 4.26222 19.9743 5.60842C20 5.80337 20 6.03558 20 6.5"
          pathLength={1}
        />
        <path
          className="justinia-library-icon-body"
          d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z"
        />
      </g>
      <g className="justinia-library-icon-files">
        <path className="justinia-library-icon-file-line" d="M18 10H13" pathLength={1} />
      </g>
    </svg>
  )
);

AnimatedLibraryIcon.displayName = "AnimatedLibraryIcon";

export const AnimatedCalendarIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.75, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-calendar-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-calendar-icon-body">
        <path d="M6.25 5.45h11.5a2 2 0 0 1 2 2v10.25a2 2 0 0 1-2 2H6.25a2 2 0 0 1-2-2V7.45a2 2 0 0 1 2-2z" />
        <path d="M4.35 9.15h15.3" />
        <path d="M8.25 3.95v3" />
        <path d="M15.75 3.95v3" />
      </g>
      <g className="justinia-calendar-icon-days">
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-one" d="M8.35 12.25h0.01" />
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-two" d="M12 12.25h0.01" />
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-three" d="M15.65 12.25h0.01" />
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-four" d="M8.35 15.55h0.01" />
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-five" d="M12 15.55h0.01" />
        <path className="justinia-calendar-icon-day justinia-calendar-icon-day-six" d="M15.65 15.55h0.01" />
      </g>
    </svg>
  )
);

AnimatedCalendarIcon.displayName = "AnimatedCalendarIcon";

export const AnimatedCasesIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.75, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-cases-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-cases-icon-briefcase">
        <path d="M8 6V4.7A1.7 1.7 0 0 1 9.7 3h4.6A1.7 1.7 0 0 1 16 4.7V6" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
        <path
          className="justinia-cases-icon-sweep"
          d="M22 13a18.15 18.15 0 0 1-20 0"
          pathLength={1}
        />
        <g className="justinia-cases-icon-latch">
          <path d="M12 12h0.01" />
        </g>
      </g>
    </svg>
  )
);

AnimatedCasesIcon.displayName = "AnimatedCasesIcon";

export const AnimatedCashboxIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.6, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-cashbox-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-cashbox-icon-bill">
        <rect className="justinia-cashbox-icon-frame" width="18" height="12" x="3" y="6" rx="2" />
        <path d="M3 10.2c2.1 0 3.2-1.1 3.2-3.2" />
        <path d="M17.8 7c0 2.1 1.1 3.2 3.2 3.2" />
        <path d="M6.2 17c0-2.1-1.1-3.2-3.2-3.2" />
        <path d="M21 13.8c-2.1 0-3.2 1.1-3.2 3.2" />
        <circle className="justinia-cashbox-icon-side-dot justinia-cashbox-icon-side-dot-left" cx="7.1" cy="12" r="0.45" />
        <circle className="justinia-cashbox-icon-side-dot justinia-cashbox-icon-side-dot-right" cx="16.9" cy="12" r="0.45" />
      </g>
      <g className="justinia-cashbox-icon-coin">
        <circle cx="12" cy="12" r="2.15" />
        <path d="M12 10.7v2.6" />
      </g>
    </svg>
  )
);

AnimatedCashboxIcon.displayName = "AnimatedCashboxIcon";

export const AnimatedStaffIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.65, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-staff-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-staff-icon-shell">
        <path d="M7.5 20.5h9" />
        <path d="M12 4.25v16.25" />
        <g className="justinia-staff-icon-balance">
          <path d="M4 7.6h1.5c2 0 4.7-.95 6.5-1.95 1.8 1 4.5 1.95 6.5 1.95H20" />
          <path d="m16.6 15.45 2.4-6.4 2.4 6.4c-.7.5-1.52.75-2.4.75s-1.7-.25-2.4-.75Z" />
          <path d="m2.6 15.45 2.4-6.4 2.4 6.4c-.7.5-1.52.75-2.4.75s-1.7-.25-2.4-.75Z" />
        </g>
      </g>
    </svg>
  )
);

AnimatedStaffIcon.displayName = "AnimatedStaffIcon";

export const AnimatedSettingsIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.65, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-settings-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-settings-icon-shell">
        <g className="justinia-settings-icon-gear">
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
          <circle cx="12" cy="12" r="3" />
        </g>
      </g>
    </svg>
  )
);

AnimatedSettingsIcon.displayName = "AnimatedSettingsIcon";

export const AnimatedAiStarsIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-ai-stars-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <path
        className="justinia-ai-stars-icon-main"
        d="M12 3.4 13.45 7.55 17.6 9 13.45 10.45 12 14.6 10.55 10.45 6.4 9 10.55 7.55 12 3.4Z"
      />
      <path
        className="justinia-ai-stars-icon-small justinia-ai-stars-icon-small-one"
        d="M5.15 13.25 5.85 15.1 7.7 15.8 5.85 16.5 5.15 18.35 4.45 16.5 2.6 15.8 4.45 15.1 5.15 13.25Z"
      />
      <path
        className="justinia-ai-stars-icon-small justinia-ai-stars-icon-small-two"
        d="M18.55 13.6 19.35 15.8 21.55 16.6 19.35 17.4 18.55 19.6 17.75 17.4 15.55 16.6 17.75 15.8 18.55 13.6Z"
      />
    </svg>
  )
);

AnimatedAiStarsIcon.displayName = "AnimatedAiStarsIcon";

export const AnimatedAccountBackIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-back-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <path className="justinia-account-back-icon-head" d="m12 19-7-7 7-7" />
      <path className="justinia-account-back-icon-line" d="M19 12H5" pathLength={1} />
    </svg>
  )
);

AnimatedAccountBackIcon.displayName = "AnimatedAccountBackIcon";

export const AnimatedAccountProfileIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.5, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="-2 -2 24 24"
      className={cn("justinia-account-profile-icon", className)}
      fill="currentColor"
      stroke="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        className="justinia-account-profile-icon-silhouette"
        d="M10 9.99998C7.7835 9.99998 5.98096 8.20598 5.98096 5.99998C5.98096 3.79398 7.7835 1.99998 10 1.99998C12.2165 1.99998 14.019 3.79398 14.019 5.99998C14.019 8.20598 12.2165 9.99998 10 9.99998ZM13.7759 10.673C15.3704 9.39598 16.2999 7.33098 15.9582 5.06998C15.5614 2.44698 13.369 0.34798 10.7224 0.04198C7.07012 -0.38102 3.97143 2.44898 3.97143 5.99998C3.97143 7.88998 4.8516 9.57398 6.22411 10.673C2.85213 11.934 0.39046 14.895 0.00463 18.891C-0.05163 19.482 0.41156 20 1.00839 20C1.51981 20 1.95588 19.616 2.0011 19.109C2.404 14.646 5.83727 12 10 12C14.1627 12 17.596 14.646 17.9989 19.109C18.0441 19.616 18.4802 20 18.9916 20C19.5884 20 20.0516 19.482 19.9954 18.891C19.6095 14.895 17.1479 11.934 13.7759 10.673Z"
      />
      <path
        className="justinia-account-profile-icon-shine"
        d="M5.55 6.15C5.55 3.42 7.64 1.18 10.34 0.96"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
);

AnimatedAccountProfileIcon.displayName = "AnimatedAccountProfileIcon";

export const AnimatedAccountSecurityIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-security-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <path
        className="justinia-account-security-icon-shield"
        d="M20 13c0 5-3.5 7.5-7.65 8.95a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.45a1.25 1.25 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"
      />
      <path
        className="justinia-account-security-icon-check"
        d="m9.25 12.2 2 2 4-4"
        pathLength={1}
      />
    </svg>
  )
);

AnimatedAccountSecurityIcon.displayName = "AnimatedAccountSecurityIcon";

export const AnimatedAccountAiIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-ai-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-account-ai-icon-shell">
        <path className="justinia-account-ai-icon-antenna" d="M12 7V3.5" />
        <path
          className="justinia-account-ai-icon-body"
          d="M6.6 7h10.8A2.6 2.6 0 0 1 20 9.6v6.8a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 16.4V9.6A2.6 2.6 0 0 1 6.6 7Z"
        />
        <path className="justinia-account-ai-icon-ear justinia-account-ai-icon-ear-left" d="M4 13H2.7" />
        <path className="justinia-account-ai-icon-ear justinia-account-ai-icon-ear-right" d="M21.3 13H20" />
        <circle className="justinia-account-ai-icon-eye justinia-account-ai-icon-eye-left" cx="9.2" cy="12.35" r="0.8" />
        <circle className="justinia-account-ai-icon-eye justinia-account-ai-icon-eye-right" cx="14.8" cy="12.35" r="0.8" />
        <path className="justinia-account-ai-icon-mouth" d="M9.5 15.35h5" pathLength={1} />
      </g>
      <circle className="justinia-account-ai-icon-antenna-dot" cx="12" cy="3.5" r="0.9" />
    </svg>
  )
);

AnimatedAccountAiIcon.displayName = "AnimatedAccountAiIcon";

export const AnimatedAccountArchiveIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-archive-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-account-archive-icon-box">
        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
        <path className="justinia-account-archive-icon-label" d="M10 12h4" pathLength={1} />
      </g>
      <rect
        className="justinia-account-archive-icon-lid"
        width="20"
        height="5"
        x="2"
        y="3"
        rx="1"
      />
    </svg>
  )
);

AnimatedAccountArchiveIcon.displayName = "AnimatedAccountArchiveIcon";

export const AnimatedAccountOrganizationIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-organization-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-account-organization-icon-shell">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
        <path d="M4 22h16" />
        <path className="justinia-account-organization-icon-door" d="M9 22v-4h6v4" pathLength={1} />
      </g>
      <g className="justinia-account-organization-icon-windows">
        <path className="justinia-account-organization-icon-window-one" d="M9 6h.01" />
        <path className="justinia-account-organization-icon-window-two" d="M15 6h.01" />
        <path className="justinia-account-organization-icon-window-three" d="M9 10h.01" />
        <path className="justinia-account-organization-icon-window-four" d="M15 10h.01" />
        <path className="justinia-account-organization-icon-window-five" d="M9 14h.01" />
        <path className="justinia-account-organization-icon-window-six" d="M15 14h.01" />
      </g>
    </svg>
  )
);

AnimatedAccountOrganizationIcon.displayName = "AnimatedAccountOrganizationIcon";

export const AnimatedAccountPlanIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-plan-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <g className="justinia-account-plan-icon-card">
        <rect width="18" height="13" x="3" y="6" rx="2" />
        <path d="M3 10h18" />
      </g>
      <path className="justinia-account-plan-icon-line" d="M7 15h4" pathLength={1} />
      <circle className="justinia-account-plan-icon-chip" cx="16.25" cy="15" r="1.25" />
    </svg>
  )
);

AnimatedAccountPlanIcon.displayName = "AnimatedAccountPlanIcon";

export const AnimatedAccountPreferencesIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, strokeWidth = 1.7, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={cn("justinia-account-preferences-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      <path
        className="justinia-account-preferences-icon-bell"
        d="M10.25 21a2 2 0 0 0 3.5 0"
      />
      <path
        className="justinia-account-preferences-icon-bell"
        d="M18 8.75a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
      />
      <path
        className="justinia-account-preferences-icon-wave"
        d="M20.5 5.5c.8.85 1.25 1.95 1.25 3.2"
        pathLength={1}
      />
      <path
        className="justinia-account-preferences-icon-wave"
        d="M3.5 5.5c-.8.85-1.25 1.95-1.25 3.2"
        pathLength={1}
      />
    </svg>
  )
);

AnimatedAccountPreferencesIcon.displayName = "AnimatedAccountPreferencesIcon";
