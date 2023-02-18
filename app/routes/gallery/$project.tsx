import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { load } from 'cheerio'
import invariant from 'tiny-invariant'
import path from 'node:path'
import fs from 'node:fs/promises'
import filenamify from 'filenamify'

export async function loader({ params }: LoaderArgs) {
  invariant(params.project, 'Project is not present')

  const url = new URL(`https://behance.net/gallery/${params.project}/_`)

  const response = await fetch(url)
  const markup = await response.text()

  const $ = load(markup)

  const title = $('[class^="Project-title-"]').text()
  const owner = $('[class^="Project-ownerName-"]').text()

  const images = $('#project-modules img')
    .map((index, image) => {
      return $(image).attr('src')
    })
    .get()

  const directory = path.resolve(
    'downloads',
    filenamify(owner),
    filenamify(title),
  )

  try {
    await fs.stat(directory)
  } catch (error) {
    await fs.mkdir(directory, { recursive: true })
  }

  for (const image of images) {
    const url = new URL(image)

    const filename = url.pathname.split('/').pop()
    invariant(filename, 'Filename not found in url')

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await fs.writeFile(path.join(directory, filename), buffer)
  }

  return json({ url, title, owner, images })
}
