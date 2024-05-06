/**
 * A Fetch API error (e.g. network error).
 */
export class FetchError extends Error {}

/**
 * A generic Fetch API response error, e.g. unexpected status code.
 */
export class ResponseError extends Error {
  static async fromResponse(response: Response): Promise<ResponseError> {
    const text = await response.text();
    return new ResponseError(response, text);
  }

  constructor(
    readonly response: Response,
    message?: string,
  ) {
    super(
      `${response.url} returned ${response.status} ${
        message || response.statusText
      }`,
    );
  }
}
