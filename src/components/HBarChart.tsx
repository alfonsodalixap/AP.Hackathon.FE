import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmt } from '../utils/format';

const AP_COLORS = ['#498E2B', '#5CB335', '#7BC95A', '#9DD970', '#BEE89A', '#C5EAB0', '#3d7623', '#2d5a1c'];

interface HBarChartProps {
  data: { name: string; value: number }[];
  color?: string | 'multi';
  formatValue?: (v: number) => string;
  opacity?: boolean;
}

export default function HBarChart({ data, color = '#498E2B', formatValue, opacity = false }: HBarChartProps) {
  const height = Math.max(120, data.length * 38 + 20);
  const maxLabelLen = Math.max(...data.map((d) => d.name.length));
  const yWidth = Math.min(180, Math.max(80, maxLabelLen * 6.5));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 48, left: 0, bottom: 4 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#6c757d' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue || ((v: number) => v.toLocaleString())}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={yWidth}
          tick={{ fontSize: 11, fill: '#333' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [typeof value === 'number' ? (formatValue ? formatValue(value) : value.toLocaleString()) : String(value), '']}
          cursor={{ fill: 'rgba(73,142,43,0.06)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((_, i) => {
            let fill = color === 'multi' ? AP_COLORS[i % AP_COLORS.length] : color;
            const style = opacity ? { opacity: 0.4 + (i / Math.max(data.length - 1, 1)) * 0.6 } : {};
            return <Cell key={i} fill={fill} style={style} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export { AP_COLORS };
export { fmt };
