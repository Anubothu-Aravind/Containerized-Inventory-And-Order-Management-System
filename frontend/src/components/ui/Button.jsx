export default function Button({ variant = "secondary", size = "md", className = "", ...props }) {
  const classes = ["ui-button", `ui-button--${variant}`, `ui-button--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}