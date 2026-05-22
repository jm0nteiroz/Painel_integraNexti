const [databases, engibrasLogs, santaMariaLogs] = await Promise.all([
  fetch("http://127.0.0.1:3001/api/databases").then((response) => response.json()),
  fetch("http://127.0.0.1:3001/api/logs?database=Integra_Nexti_Engibrasdev").then((response) => response.json()),
  fetch("http://127.0.0.1:3001/api/logs?database=IntegraNexti_StaMaria").then((response) => response.json()),
]);

const summarize = (logs) => ({
  total: logs.length,
  entities: [...new Set(logs.map((log) => log.entity))].sort(),
  hasBairroOuCidade: logs.some((log) => /bairro|cidade/i.test(log.entity)),
  hasProtheus: logs.some((log) => /protheus/i.test(log.entity)),
});

console.log(JSON.stringify({
  databases,
  engibras: summarize(engibrasLogs),
  santaMaria: summarize(santaMariaLogs),
}, null, 2));
