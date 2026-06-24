
import Card from './Card';

export const ChartContainer = ({
  title,
  children,
  className = '',
  ...props
}) => {
  return (
    <Card className={`flex flex-col h-full ${className}`} {...props}>
      {title && (
        <h4 className="text-base font-bold font-display tracking-wide mb-4 bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent select-none text-left">
          {title}
        </h4>
      )}
      <div className="flex-1 w-full min-h-[250px] relative">
        {children}
      </div>
    </Card>
  );
};

export default ChartContainer;
