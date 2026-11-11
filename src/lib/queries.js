import { all } from "./db";

export const TASK_SELECT = `
  SELECT t.*, c.name AS client, s.name AS service, u.name AS assignee
  FROM tasks t
  JOIN clients c ON c.id = t.client_id
  JOIN services s ON s.id = t.service_id
  JOIN users u ON u.id = t.assignee_id`;

export const parseList = (json) => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const activeUsers = () => all("SELECT * FROM users WHERE active = 1 ORDER BY name");
export const activeClients = () => all("SELECT * FROM clients WHERE active = 1 ORDER BY name");
export const services = () => all("SELECT * FROM services ORDER BY sort, name");
