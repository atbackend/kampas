export const PageHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="mb-8">
    <div className="flex items-center gap-4 mb-6">
      {Icon && (
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-accent)" }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-fg)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1" style={{ color: "var(--color-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
);