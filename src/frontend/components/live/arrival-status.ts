export function arrivalStatus(expectedAt:string|null,arrivedAt:string|null,now:number) {
  if(!expectedAt) return {status:arrivedAt?'ARRIVED':'UPCOMING',minutesLate:0};
  const expected=new Date(expectedAt).getTime();
  if(!Number.isFinite(expected))return {status:arrivedAt?'ARRIVED':'UPCOMING',minutesLate:0};
  const observed=arrivedAt?new Date(arrivedAt).getTime():now;
  // Round up so a missed arrival becomes visible immediately, even in the first minute.
  const minutesLate=Math.max(0,Math.ceil((observed-expected)/60000));
  return {status:arrivedAt?'ARRIVED':minutesLate>0?'LATE':'UPCOMING',minutesLate};
}
