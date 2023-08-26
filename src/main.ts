import * as github from '@actions/github'

import processCmd from './process'

const main = async () => {
  const rawcmd: string = github.context.payload.comment?.body
  if (!rawcmd) {
    return
  }

  const githubToken = process.env.GH_TOKEN
  if (!githubToken) {
    throw new Error('GH_TOKEN is not set')
  }
  const octokit = github.getOctokit(githubToken)

  const result = await processCmd(octokit, rawcmd, {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.issue.number
  })

  if (!result) {
    return
  }

  if (result.createComment) {
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.issue.number,
      body: result.createComment
    })
  }

  if (result.merge) {
    // approve the pr
    await octokit.rest.pulls.createReview({
      ...github.context.repo,
      pull_number: github.context.issue.number,
      event: 'APPROVE'
    })

    await octokit.rest.pulls.merge({
      ...github.context.repo,
      pull_number: github.context.issue.number,
      sha: result.merge
    })
  }

  if (result.close) {
    await octokit.rest.issues.update({
      ...github.context.repo,
      issue_number: github.context.issue.number,
      state: 'closed'
    })
  }
}

main()
  // eslint-disable-next-line github/no-then
  .catch(console.error)
  .finally(() => process.exit())
