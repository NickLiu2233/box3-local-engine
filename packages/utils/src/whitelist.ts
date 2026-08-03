import minimatch from 'minimatch';

const regex = /^https?:\/\//i;
function urlNoProtocol(url: string) {
  return url.replace(regex, '');
}

export class Whitelist {
  private rules: string[] = [];

  public constructor(list?: string[]) {
    if (list) {
      for (const rule of list) {
        this.add(rule);
      }
    }
  }

  public add(rule: string) {
    this.rules.push(rule);
  }

  public test(url: string) {
    for (const rule of this.rules) {
      if (minimatch(urlNoProtocol(url), rule)) {
        return true;
      }
    }
    return false;
  }
}
