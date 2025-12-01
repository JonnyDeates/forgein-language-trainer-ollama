const Step = ({ num, title, desc, children }: { num: string, title: string, desc: string, children?: any }) => (
  <div className="flex gap-6">
    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm ring-1 ring-blue-50">
      {num}
    </div>
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{desc}</p>
      {children}
    </div>
  </div>
);
export default Step;