export default function ResultsPage() {
  return (
    <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <a className="hover:text-primary" href="#">AppFinder</a>
          <span>/</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">Results</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Apps for your lifestyle</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-x-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-primary/20">
            Lifestyle: Active
          </div>
          <div className="flex items-center gap-x-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-primary/20">
            Intent: Productivity
          </div>
          <div className="flex items-center gap-x-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Sort: Relevance
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8">
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDWEa8Hn6cld5ard94FMQHgdaXm_iXKQt7xFVNl5id7m9CmPPxoywjbuI5ez2Ac5aAHlKDLp04rjwUI3hVNOgGHGMrZh1tIKzAsdFT3ZqkrXMScg33iWB5tlSkcUE7b3fzVt4McqoINcmqHVR1-3YmrCtyasR-pCtLSkvzDfcwqS_ZdDjwiZCFmzERpFv097pSIqBvAUk-UxEZHLRLGTMO5piswN1RJwitHGzbjZo4ErSQXY0VlZf4irezwana85L5ZlrTYtLdi3dMe")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">FitTrack Pro</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fitness Tracking</p>
          </a>
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAsVIciqsCEyKgCHeDf7zdiHCGs4p2pfbsbjzT2ha1JzAfdPN_Z5xI6kdzhVssDjxxeY4N2dwb0dD7AzuoExSl48-BRvrF3lU_IkezHylsLOnTDd-_v5LAHHZDCs2wf9tq0JasWsJo1fxFil0QLz6tV7OHspJp7bSmhh5sQMJoPb1WP-CRlR8MXXQ4ENQVO9u0kFoVtv8nRCMtOmOwqge8oJC3Q3v-JfhhPLntltiDkv7LzyXtyNGmF9yy6bB1ufOhFKnfhvrFhMvxV")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Mindful Moments</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Meditation & Mindfulness</p>
          </a>
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDMdNNCl7WoJCfgTGbLpin1p5JkNpyb7tsZ_JXoPwNeKJ_i37i-O3Gl8ZzFbxStGAVKcDC4vfYiS9TWc820M9fAiJur4BU-X2r-GkoNy8h9EQ91flpzHdhzguRFql9RL-o_7-pKgp36MgUVgFwd4inYy8bdZ_lPcWFbHLnYLVjLUp0UGeufQcphXXBFzEGdi6T-5njbZmk4IC1vnm0h-NHSp83SJYUPaJXcyTvoJPuZBOpYpV9vAkn9X89Bd0q11O6XzSJv8QWO1qKJ")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">TaskMaster</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Task Management</p>
          </a>
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCXKJIVPVyJ9OME-kaaAPtrwTunvWu2al3aiGQm6xsPJfGqom_wBZPg-5hXdDPCp58ERxAoF5I2NXz0le2C8ZOSXQXhFrqC_QW8gVtsJ7ko7kwTEyhpKVnM8cL16MOKhnNJGrWKP6e5fegFeICRgrAc-TWVHMWeX6a6WcMfxSzeExFIV6UqFrP8vk9S1dpMz8EcN2yHvSmGwOFU6Ic3A1JcHb06CbtmyPInMTs4n0llAW90LsVc_KCh-4N3A-WIHLA7wkkix7Mt0Gnm")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Healthy Eats</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Healthy Recipes</p>
          </a>
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBbQrPs-XXxD1YTqHJI_BQ2zyNdf7FcCgrFhEw-yZGrUvFrI7Ys9PAJ02ceZ5pGywacxqhVHzRkFJ44tgH_KIhss6oOpgUXmfpww8H_q-qgqBaq9l2dxVAqQvkUdl0HO77rBuQOA6nbqY2oJk7xrUVNJN-Ihjc94bpwocgMkTHZZRlNtHvZPy7q0-vDIiRVgmSis-Ylk-GvJbAyfahaFVFbUgZqN2_wRPVb6Vlvs68bp0luMzt91d1xSWF1hIdiSpkQ2bNWqHLBIEDA")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Active Life</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Outdoor Activities</p>
          </a>
          <a className="group" href="#">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_UcO8bTknlmRv4oa197cpMrgAVKzk96yh3-8YQYsxzfegPz8HHQAoWQaLCAiidCcf2osifQDXDsVmZaxky89gxlar6e1aC76iOQK1OGQKfaB3LNbjR-iOBSQkhjCI_VToCT9d9K7tMFYMDQ4-RXZ6_xDGq06x_m1spMzniqWHo62j1IyGLxa3MYzqmWjHO6gKuG3AR8N2WeGbmtFfo2kj7QDzJCW9_6ZklKRjV1mqEaTwk152PD63RirW63LpDIvwKBqX2ruXSs35")'}}></div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">FocusFlow</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Productivity Booster</p>
          </a>
        </div>
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
          <a className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">
            <span className="sr-only">Previous</span>
            <svg fill="currentColor" height="20px" viewBox="0 0 256 256" width="20px" xmlns="http://www.w3.org/2000/svg">
              <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
            </svg>
          </a>
          <a aria-current="page" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" href="#">1</a>
          <a className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">2</a>
          <a className="hidden h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary sm:inline-flex" href="#">3</a>
          <a className="hidden h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary sm:inline-flex" href="#">4</a>
          <a className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">
            <span className="sr-only">Next</span>
            <svg fill="currentColor" height="20px" viewBox="0 0 256 256" width="20px" xmlns="http://www.w3.org/2000/svg">
              <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
            </svg>
          </a>
        </nav>
      </div>
    </main>
  )
}