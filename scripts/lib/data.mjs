/**
 * Gathers everything the DS screens display.
 *
 * Degrades in three steps so the build never hard-fails:
 *   graphql  - a token with read:user, gives the real contribution calendar
 *   events   - unauthenticated REST, calendar rebuilt from ~90 days of public events
 *   demo     - no network at all; deterministic sample data for local preview
 */

const API = 'https://api.github.com';

async function gh(path, token) {
  const res = await fetch(API + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ds-readme',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function graphql(query, variables, token) {
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ds-readme',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`graphql -> ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const CALENDAR_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`;

const iso = (d) => d.toISOString().slice(0, 10);

/** Fill a 53-week grid ending today from a {date: count} map. */
function gridFromCounts(counts) {
  const days = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Walk back to the Sunday on or before (today - 52 weeks).
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 7 * 52 - today.getUTCDay());
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = iso(d);
    days.push({ date: key, count: counts[key] ?? 0 });
  }
  return days;
}

function streaks(days) {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  // Current streak: walk back from today, tolerating a still-empty today.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { current, longest };
}

async function topLanguages(owned, token) {
  const totals = {};
  // Language byte counts need one call per repo; cap it to stay well inside
  // the rate limit on the most recently pushed repos.
  for (const r of owned.slice(0, 15)) {
    try {
      const langs = await gh(`/repos/${r.full_name}/languages`, token);
      for (const [name, bytes] of Object.entries(langs)) {
        totals[name] = (totals[name] ?? 0) + bytes;
      }
    } catch {
      /* a single unreadable repo shouldn't sink the build */
    }
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, bytes]) => ({ name, pct: (bytes / sum) * 100 }));
}

/**
 * Recent commits, read from the repos themselves rather than the events feed.
 * PushEvent payloads routinely arrive without their `commits` array, so the
 * events API is not a dependable source for commit messages.
 */
async function recentCommits(owned, login, token) {
  const found = [];
  for (const r of owned.slice(0, 4)) {
    try {
      const commits = await gh(
        `/repos/${r.full_name}/commits?author=${login}&per_page=3`,
        token
      );
      for (const c of commits) {
        found.push({
          repo: r.name,
          message: c.commit.message.split('\n')[0],
          date: (c.commit.author?.date ?? c.commit.committer?.date ?? '').slice(0, 10),
        });
      }
    } catch {
      /* empty repo, or no commits by this author */
    }
  }
  return found.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
}

/** Only needed to approximate a calendar when there is no token for GraphQL. */
async function eventDayCounts(login, token) {
  try {
    const events = await gh(`/users/${login}/events/public?per_page=100`, token);
    const counts = {};
    for (const e of events) {
      if (e.type !== 'PushEvent') continue;
      const day = e.created_at.slice(0, 10);
      counts[day] = (counts[day] ?? 0) + (e.payload.commits?.length ?? 1);
    }
    return counts;
  } catch {
    return {};
  }
}

function demo() {
  const counts = {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 372; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const r = rand();
    counts[iso(d)] = r > 0.55 ? Math.ceil(rand() * 9) : 0;
  }
  const days = gridFromCounts(counts);
  return {
    source: 'demo',
    login: 'gogeorge',
    name: 'George',
    repoCount: 24,
    followers: 41,
    stars: 132,
    since: '2019-04-02T00:00:00Z',
    days,
    total: days.reduce((a, d) => a + d.count, 0),
    ...streaks(days),
    languages: [
      { name: 'TypeScript', pct: 41 },
      { name: 'Go', pct: 27 },
      { name: 'CSS', pct: 18 },
      { name: 'Python', pct: 14 },
    ],
    commits: [
      { repo: 'gogeorge', message: 'Render the DS chrome as pure SVG', date: iso(today) },
      { repo: 'cnf-prompts', message: 'Normalise clause ordering', date: iso(today) },
      { repo: 'ui-bits', message: 'Add focus ring to menu tiles', date: iso(today) },
    ],
  };
}

export async function collect(login, token) {
  try {
    const [user, repos] = await Promise.all([
      gh(`/users/${login}`, token),
      gh(`/users/${login}/repos?per_page=100&sort=pushed`, token),
    ]);
    const owned = repos.filter((r) => !r.fork && !r.archived);

    const [languages, commits] = await Promise.all([
      topLanguages(owned, token),
      recentCommits(owned, login, token),
    ]);

    let days;
    let total;
    let source = 'events';

    if (token) {
      try {
        const data = await graphql(CALENDAR_QUERY, { login }, token);
        const cal = data.user.contributionsCollection.contributionCalendar;
        const counts = {};
        for (const w of cal.weeks) {
          for (const d of w.contributionDays) counts[d.date] = d.contributionCount;
        }
        days = gridFromCounts(counts);
        total = cal.totalContributions;
        source = 'graphql';
      } catch {
        /* token can't read contributions; fall through to events */
      }
    }

    if (!days) {
      days = gridFromCounts(await eventDayCounts(login, token));
      total = days.reduce((a, d) => a + d.count, 0);
    }

    return {
      source,
      login: user.login,
      name: user.name || user.login,
      repoCount: user.public_repos,
      followers: user.followers,
      stars: owned.reduce((a, x) => a + x.stargazers_count, 0),
      since: user.created_at,
      days,
      total,
      ...streaks(days),
      languages,
      commits,
    };
  } catch (err) {
    console.warn(`! GitHub fetch failed (${err.message}) - using demo data`);
    return demo();
  }
}
